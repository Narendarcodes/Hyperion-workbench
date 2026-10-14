#!/usr/bin/env python3
"""Build the Hyperion OCR eval set.

Synthetic: fictional Hyperion plant docs (markdown) -> clean PDF (reportlab) -> page PNG with
scan degradation. Ground truth comes from the clean PDF page itself (exact text drawn, table
cells via pymupdf find_tables on ruled tables, tags by regex).
Real: public refinery corpus pages (DOC-010 spec, DOC-012 Kuphaldt CC-BY training diagrams,
CSB DOC-007/008 tables) rasterised + light scan degradation; ground truth = embedded text layer
("silver": reading order of the text layer may differ from visual order).
DOC-011 (true scan, no text layer): key-fact ground truth in doc011_facts.json.
"""
import json, re, random, io, os, sys, unicodedata, html
from pathlib import Path
import numpy as np, cv2, pymupdf
from PIL import Image
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT = Path(sys.argv[1] if len(sys.argv) > 1 and __name__ == '__main__' else 'evalset')
EVAL = Path('/workspace/work/hyperion_eval/documents.jsonl')
CORPUS = Path('/workspace/work/refinery-corpus/corpus')
DPI = 200
random.seed(1460); np.random.seed(1460)

FD = os.environ.get('HX_FONT_DIR', '/usr/share/fonts/truetype/dejavu/')
pdfmetrics.registerFont(TTFont('DV', FD + 'DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DVB', FD + 'DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DVS', FD + 'DejaVuSerif.ttf'))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('DV', normal='DV', bold='DVB', italic='DV', boldItalic='DVB')

TAG_RE = re.compile(r'\b[A-Z]{1,6}(?:-[A-Z0-9]{1,8}){1,4}\b')

def norm_dash(s):
    return re.sub('[\u2010\u2011\u2012\u2013\u2014\u2212]', '-', s)

def tags_in(text):
    t = norm_dash(unicodedata.normalize('NFKC', text))
    out = []
    for m in TAG_RE.findall(t):
        if re.search(r'\d', m) and m not in out:
            out.append(m)
    return out

def inline(s):
    s = html.escape(s.replace('**', '\x01')).replace('&lt;br&gt;', '<br/>').replace('&lt;br/&gt;', '<br/>')
    parts = s.split('\x01')
    s = ''.join(p if i % 2 == 0 else f'<b>{p}</b>' for i, p in enumerate(parts))
    s = re.sub(r'(?<![\w*])\*(?!\s)([^*]+?)\*', r'\1', s)
    s = s.replace('`', '')
    return s

def md_to_flow(md, base, small):
    ss = getSampleStyleSheet()
    body = ParagraphStyle('b', parent=ss['BodyText'], fontName='DV', fontSize=9, leading=11.5)
    cell = ParagraphStyle('c', parent=body, fontSize=small, leading=small + 1.6)
    hs = {1: ParagraphStyle('h1', parent=body, fontName='DVB', fontSize=14, leading=17, spaceBefore=6, spaceAfter=4),
          2: ParagraphStyle('h2', parent=body, fontName='DVB', fontSize=12, leading=15, spaceBefore=6, spaceAfter=3),
          3: ParagraphStyle('h3', parent=body, fontName='DVB', fontSize=10.5, leading=13, spaceBefore=5, spaceAfter=2)}
    flow, lines, i = [], md.splitlines(), 0
    width = base
    while i < len(lines):
        ln = lines[i].rstrip()
        if ln.strip().startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                r = lines[i].strip().strip('|')
                cells = [c.strip() for c in r.split('|')]
                if not all(re.fullmatch(r':?-{2,}:?', c) or c == '' for c in cells):
                    rows.append(cells)
                i += 1
            if not rows: continue
            ncol = max(len(r) for r in rows)
            rows = [r + [''] * (ncol - len(r)) for r in rows]
            data = [[Paragraph(inline(c), cell) for c in r] for r in rows]
            t = Table(data, colWidths=[width / ncol] * ncol, repeatRows=1)
            t.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 0.6, colors.black), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                   ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dddddd'))]))
            flow += [t, Spacer(1, 6)]
            continue
        s = ln.strip()
        if not s: i += 1; continue
        if re.fullmatch(r'-{3,}|\*{3,}', s): flow.append(Spacer(1, 6)); i += 1; continue
        m = re.match(r'(#{1,6})\s+(.*)', s)
        if m:
            flow.append(Paragraph(inline(m.group(2)), hs[min(3, len(m.group(1)))])); i += 1; continue
        m = re.match(r'([-*+]|\d+[.)])\s+(.*)', s)
        if m:
            bullet = '•' if m.group(1) in '-*+' else m.group(1)
            flow.append(Paragraph(f'{bullet} ' + inline(m.group(2)), ParagraphStyle('li', parent=body, leftIndent=12, firstLineIndent=-8)))
            i += 1; continue
        flow.append(Paragraph(inline(s.lstrip('> ')), body)); i += 1
    return flow

def render_doc(doc, path):
    md = doc['text']
    maxcols = max([l.count('|') - 1 for l in md.splitlines() if l.strip().startswith('|')] or [0])
    land = maxcols > 7
    ps = landscape(A4) if land else A4
    small = 6.2 if maxcols > 10 else (7 if maxcols > 6 else 8)
    d = SimpleDocTemplate(str(path), pagesize=ps, leftMargin=36, rightMargin=36, topMargin=40, bottomMargin=40)
    d.build(md_to_flow(md, ps[0] - 72, small))

def page_gt(page):
    text = page.get_text('text')
    cells = []
    try:
        for t in page.find_tables(strategy='lines').tables:
            for row in t.extract():
                for c in row:
                    if c and c.strip(): cells.append(re.sub(r'\s+', ' ', c).strip())
    except Exception:
        pass
    return text, cells

def degrade(img, level):
    """img: uint8 gray. level 0 light, 1 medium, 2 heavy."""
    h, w = img.shape
    ang = random.uniform(-1, 1) * [0.6, 1.8, 3.2][level]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), ang, 1.0)
    img = cv2.warpAffine(img, M, (w, h), borderValue=random.randint(235, 255))
    if level >= 1:
        d = [0, 8, 18][level]
        src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
        dst = src + np.float32(np.random.uniform(-d, d, (4, 2)))
        img = cv2.warpPerspective(img, cv2.getPerspectiveTransform(src, dst), (w, h), borderValue=245)
    img = img.astype(np.float32)
    # paper tone + uneven illumination
    yy, xx = np.mgrid[0:h, 0:w]
    shade = 1 - [0.03, 0.08, 0.15][level] * ((xx / w - random.random()) ** 2 + (yy / h - random.random()) ** 2)
    img = img * shade * random.uniform(0.9, 1.0) + random.uniform(0, 15)
    k = [0.6, 1.0, 1.5][level]
    img = cv2.GaussianBlur(img, (0, 0), k)
    img += np.random.normal(0, [5, 11, 18][level], img.shape)
    if level == 2:
        sp = np.random.random(img.shape)
        img[sp < 0.002] = 0; img[sp > 0.998] = 255
    img = np.clip(img, 0, 255).astype(np.uint8)
    if level >= 1:  # resolution loss
        f = [1, 0.8, 0.65][level]
        img = cv2.resize(cv2.resize(img, None, fx=f, fy=f, interpolation=cv2.INTER_AREA), (w, h), interpolation=cv2.INTER_LINEAR)
    q = [80, 55, 35][level]
    ok, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, q])
    return cv2.imdecode(buf, cv2.IMREAD_GRAYSCALE), ang

def raster(page):
    pix = page.get_pixmap(dpi=DPI, colorspace=pymupdf.csGRAY)
    return np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width).copy()

def save_page(img, pid, meta, items):
    (OUT / 'images').mkdir(parents=True, exist_ok=True)
    (OUT / 'pdf').mkdir(parents=True, exist_ok=True)
    p = OUT / 'images' / f'{pid}.png'
    Image.fromarray(img).save(p, optimize=True)
    # image-only PDF wrapper (exercises the scanned-PDF path of read_pdf)
    Image.fromarray(img).convert('RGB').save(OUT / 'pdf' / f'{pid}.pdf', resolution=DPI)
    meta['image'] = f'images/{pid}.png'; meta['pdf'] = f'pdf/{pid}.pdf'; meta['id'] = pid
    items.append(meta)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'clean_pdf').mkdir(exist_ok=True)
    docs = [json.loads(l) for l in open(EVAL)]
    by = {}
    for d in docs: by.setdefault(d['type'], []).append(d)
    pick = []
    for t, lst in sorted(by.items()):
        pick += random.sample(lst, 14 if t != 'equipment manual excerpt' else 16)  # 44 docs
    items = []
    n2 = 0
    for k, doc in enumerate(pick):
        cp = OUT / 'clean_pdf' / f"{doc['doc_id']}.pdf"
        render_doc(doc, cp)
        pdf = pymupdf.open(cp)
        pages = [0] + ([1] if pdf.page_count > 1 and n2 < 20 and k % 2 == 0 else [])
        n2 += len(pages) - 1
        for pi in pages:
            page = pdf[pi]
            text, cells = page_gt(page)
            level = (k + pi) % 3
            img, ang = degrade(raster(page), level)
            save_page(img, f"SYN-{doc['doc_id']}-p{pi+1}", {
                'source': 'synthetic', 'doc_id': doc['doc_id'], 'doc_type': doc['type'], 'page': pi + 1,
                'degradation': ['light', 'medium', 'heavy'][level], 'rotation_deg': round(ang, 2),
                'gt_text': text, 'gt_cells': cells, 'gt_tags': tags_in(text), 'gt_quality': 'exact (rendered from source)',
                'license': 'synthetic, fictional (Hyperion eval set v1)'}, items)
    # real pages
    real = [('DOC-010', [1, 2], 'MRPL gasoline spec (company public spec sheet)'),
            ('DOC-012', [560, 562, 564, 566, 572, 579, 586, 587, 588], 'Kuphaldt, Lessons In Industrial Instrumentation v2.32, CC-BY-4.0 (training diagrams, not as-built)'),
            ('DOC-007', [116, 117, 118], 'US CSB Chevron Richmond report, US public domain'),
            ('DOC-008', [79, 100, 145], 'US CSB Tesoro Anacortes report, US public domain')]
    for j, (doc, pages, lic) in enumerate(real):
        pdf = pymupdf.open(CORPUS / 'raw' / f'{doc}.pdf')
        for n, pno in enumerate(pages):
            page = pdf[pno - 1]
            text, cells = page_gt(page)
            level = (n + j) % 2
            img, ang = degrade(raster(page), level)
            save_page(img, f'REAL-{doc}-p{pno}', {
                'source': 'real', 'doc_id': doc, 'doc_type': {'DOC-010': 'product spec table', 'DOC-012': 'P&ID / instrumentation diagram',
                                                            'DOC-007': 'CSB report table', 'DOC-008': 'CSB report table'}[doc],
                'page': pno, 'degradation': ['light', 'medium'][level], 'rotation_deg': round(ang, 2),
                'gt_text': text, 'gt_cells': cells, 'gt_tags': tags_in(text),
                'gt_quality': 'silver (embedded text layer; reading order may differ)', 'license': lic}, items)
    for p in [1, 2]:
        img = np.array(Image.open(CORPUS / 'images' / f'DOC-011_p{p}.png').convert('L'))
        save_page(img, f'REAL-DOC-011-p{p}', {'source': 'real-scan', 'doc_id': 'DOC-011', 'doc_type': 'scanned product spec (IS 1460:2017 Table 1, IOCL HSD)',
                  'page': p, 'degradation': 'native scan', 'gt_text': None, 'gt_cells': [], 'gt_tags': [],
                  'gt_quality': 'key facts only (doc011_facts.json)', 'license': 'IOCL public spec sheet (company-hosted)'}, items)
    with open(OUT / 'manifest.jsonl', 'w') as f:
        for it in items: f.write(json.dumps(it, ensure_ascii=False) + '\n')
    from collections import Counter
    print(len(items), Counter(i['source'] for i in items), Counter(i['degradation'] for i in items))
    print('cells', sum(len(i['gt_cells']) for i in items), 'tags', sum(len(i['gt_tags']) for i in items))

if __name__ == '__main__':
    main()
