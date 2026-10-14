"""Plant-floor transcript normaliser for Telugu / Hindi / English (+ code-mixed).

Two directions:
  verbalize(ref, lang)  -> TTS text: equipment tags spelled letter-by-letter and
                           digit-by-digit, numbers as English number words (how
                           operators say them), units spoken, all in the target
                           script (Telugu / Devanagari / English).
  canonicalize(text)    -> canonical token list used for scoring and as the
                           provider-side post-processor: spelled tags in any of
                           the three scripts are folded back to "P101A", English
                           number words (Latin / Telugu / Devanagari spelling)
                           and native digit names become digits, unit phrases
                           become unit tokens.
Synthetic-benchmark tooling; the TS provider ports the canonicalize half.
"""
import re
import unicodedata

LETTERS = {
    'en': {c: c for c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'},
    'te': dict(A='ఏ', B='బీ', C='సీ', D='డీ', E='ఈ', F='ఎఫ్', G='జీ', H='హెచ్', I='ఐ', J='జే', K='కే', L='ఎల్', M='ఎం',
               N='ఎన్', O='ఓ', P='పీ', Q='క్యూ', R='ఆర్', S='ఎస్', T='టీ', U='యూ', V='వీ', W='డబ్ల్యూ', X='ఎక్స్', Y='వై', Z='జెడ్'),
    'hi': dict(A='ए', B='बी', C='सी', D='डी', E='ई', F='एफ़', G='जी', H='एच', I='आई', J='जे', K='के', L='एल', M='एम',
               N='एन', O='ओ', P='पी', Q='क्यू', R='आर', S='एस', T='टी', U='यू', V='वी', W='डब्ल्यू', X='एक्स', Y='वाई', Z='ज़ेड'),
}
# extra spellings ASR engines emit for letter names (recognition side only)
LETTER_ALIASES = {
    'te': {'పి': 'P', 'ఎ': 'A', 'బి': 'B', 'సి': 'C', 'డి': 'D', 'టి': 'T', 'వి': 'V', 'జి': 'G', 'కె': 'K', 'ఎమ్': 'M', 'హెచ్‌': 'H', 'ఎస్‌': 'S'},
    'hi': {'पि': 'P', 'एफ': 'F', 'ऐ': 'A', 'बि': 'B', 'टि': 'T', 'वि': 'V', 'ज़ेड': 'Z', 'जेड': 'Z', 'के': 'K'},
    'en': {'pee': 'P', 'ay': 'A', 'bee': 'B', 'see': 'C', 'dee': 'D', 'eff': 'F', 'aitch': 'H', 'kay': 'K', 'el': 'L', 'em': 'M',
           'ess': 'S', 'tee': 'T', 'vee': 'V', 'ex': 'X'},
}
EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
          'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
EN_TENS = {'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90}
TRANS = {
    'te': dict(zero='జీరో', one='వన్', two='టూ', three='త్రీ', four='ఫోర్', five='ఫైవ్', six='సిక్స్', seven='సెవెన్', eight='ఎయిట్', nine='నైన్',
               ten='టెన్', eleven='ఎలెవెన్', twelve='ట్వెల్వ్', thirteen='థర్టీన్', fourteen='ఫోర్టీన్', fifteen='ఫిఫ్టీన్', sixteen='సిక్స్టీన్',
               seventeen='సెవెంటీన్', eighteen='ఎయిటీన్', nineteen='నైంటీన్', twenty='ట్వెంటీ', thirty='థర్టీ', forty='ఫార్టీ', fifty='ఫిఫ్టీ',
               sixty='సిక్స్టీ', seventy='సెవెంటీ', eighty='ఎయిటీ', ninety='నైంటీ', hundred='హండ్రెడ్', thousand='థౌజండ్', point='పాయింట్'),
    'hi': dict(zero='ज़ीरो', one='वन', two='टू', three='थ्री', four='फ़ोर', five='फ़ाइव', six='सिक्स', seven='सेवन', eight='एट', nine='नाइन',
               ten='टेन', eleven='इलेवन', twelve='ट्वेल्व', thirteen='थर्टीन', fourteen='फ़ोर्टीन', fifteen='फ़िफ़्टीन', sixteen='सिक्सटीन',
               seventeen='सेवनटीन', eighteen='एटीन', nineteen='नाइनटीन', twenty='ट्वेंटी', thirty='थर्टी', forty='फ़ोर्टी', fifty='फ़िफ़्टी',
               sixty='सिक्सटी', seventy='सेवनटी', eighty='एटी', ninety='नाइनटी', hundred='हंड्रेड', thousand='थाउज़ेंड', point='पॉइंट'),
}
# recognition-side alternative spellings of English number words
NUM_ALIASES = {
    'te': {'జిరో': 'zero', 'జీరొ': 'zero', 'థ్రీ': 'three', 'ట్వెల్': 'twelve', 'ఫోర్టీ': 'forty', 'ఫోర్తీ': 'forty', 'ఎయిటి': 'eighty',
           'హండ్రడ్': 'hundred', 'హన్డ్రెడ్': 'hundred', 'థౌసండ్': 'thousand', 'పాయింట్‌': 'point'},
    'hi': {'जीरो': 'zero', 'शून्य': 'zero', 'फोर': 'four', 'फाइव': 'five', 'फिफ्टी': 'fifty', 'फोर्टी': 'forty', 'हन्ड्रेड': 'hundred',
           'हंड्रड': 'hundred', 'थाउजेंड': 'thousand', 'थाउजन': 'thousand', 'थाउज़न': 'thousand', 'थाउसेंड': 'thousand', 'पॉइन्ट': 'point', 'प्वाइंट': 'point', 'पोइंट': 'point'},
}
NATIVE_DIGITS = {
    'సున్నా': 0, 'ఒకటి': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5, 'ఆరు': 6, 'ఏడు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9,
    'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5, 'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9,
}
UNIT_SPOKEN = {
    'en': {'bar': 'bar', 'kg/cm2': 'kg per square centimetre', 'm3/h': 'cubic metres per hour', '%': 'percent', '°C': 'degrees celsius', 'rpm': 'R P M'},
    'te': {'bar': 'బార్', 'kg/cm2': 'కేజీ పర్ స్క్వేర్ సెంటీమీటర్', 'm3/h': 'క్యూబిక్ మీటర్స్ పర్ అవర్', '%': 'పర్సెంట్', '°C': 'డిగ్రీస్ సెల్సియస్', 'rpm': 'ఆర్ పీ ఎం'},
    'hi': {'bar': 'बार', 'kg/cm2': 'केजी पर स्क्वेयर सेंटीमीटर', 'm3/h': 'क्यूबिक मीटर पर आवर', '%': 'परसेंट', '°C': 'डिग्री सेल्सियस', 'rpm': 'आर पी एम'},
}
UNIT_TOKEN = {'bar': 'bar', 'kg/cm2': 'kgcm2', 'm3/h': 'm3h', '%': 'pct', '°C': 'degc', 'rpm': 'rpm'}
# phrase -> unit token (recognition); longest first at runtime
UNIT_PHRASES = {
    'degc': ['degrees celsius', 'degree celsius', 'degrees centigrade', 'deg c', '°c', '° c', 'डिग्री सेल्सियस', 'डिग्री सेंटीग्रेड', 'डिग्री सी',
             'డిగ్రీస్ సెల్సియస్', 'డిగ్రీ సెల్సియస్', 'డిగ్రీల సెల్సియస్', 'డిగ్రీ సీ', 'డిగ్రీలు', 'degrees', 'डिग्री', 'డిగ్రీ'],
    'm3h': ['cubic metres per hour', 'cubic meters per hour', 'cubic meter per hour', 'm3/h', 'm³/h', 'క్యూబిక్ మీటర్స్ పర్ అవర్',
            'క్యూబిక్ మీటర్ పర్ అవర్', 'क्यूबिक मीटर पर आवर', 'क्यूबिक मीटर प्रति घंटा', 'क्यूबिक मीटर पर घंटा'],
    'kgcm2': ['kg per square centimetre', 'kg per square centimeter', 'kilogram per square centimetre', 'kg/cm2', 'kg/cm²',
              'కేజీ పర్ స్క్వేర్ సెంటీమీటర్', 'केजी पर स्क्वेयर सेंटीमीटर', 'किलोग्राम प्रति वर्ग सेंटीमीटर'],
    'pct': ['percent', 'per cent', '%', 'పర్సెంట్', 'శాతం', 'परसेंट', 'प्रतिशत', 'पर्सेंट'],
    'rpm': ['r p m', 'rpm', 'ఆర్ పీ ఎం', 'ఆర్\u200cపీఎం', 'ఆర్పీఎం', 'आर पी एम', 'आरपीएम'],
    'bar': ['bar', 'బార్', 'बार'],
}
SHORT_WORDS = set('a an at to in on is it be by of or if as up so no go do we me my us am are was the and for set run log via per from into open shut stop trip than then that this with keep hold show give make take read rate flow temp high low drop rise near over upto till when what all one two six ten'.split())
TAG_RE = re.compile(r'\b([A-Z]{1,4})-?(\d{2,5})([A-Z]?)\b')
NUM_RE = re.compile(r'(?<![\w.])(\d+(?:\.\d+)?)(?![\w])')
UNIT_RE = re.compile(r'kg/cm2|m3/h|°\s?C|%|\brpm\b|\bbar\b')


def en_words(n: str) -> list[str]:
    """English cardinal words for a numeric string (integers < 100000, one decimal part read digit by digit)."""
    if '.' in n:
        a, b = n.split('.', 1)
        return en_words(a) + ['point'] + [EN_NUM[int(c)] for c in b]
    v = int(n)
    if v < 20:
        return [EN_NUM[v]]
    if v < 100:
        t = [k for k, x in EN_TENS.items() if x == v // 10 * 10][0]
        return [t] + ([EN_NUM[v % 10]] if v % 10 else [])
    if v < 1000:
        return [EN_NUM[v // 100], 'hundred'] + (en_words(str(v % 100)) if v % 100 else [])
    return en_words(str(v // 1000)) + ['thousand'] + (en_words(str(v % 1000)) if v % 1000 else [])


def _w(words: list[str], lang: str) -> str:
    return ' '.join(words) if lang == 'en' else ' '.join(TRANS[lang][w] for w in words)


def verbalize(ref: str, lang: str, word_map: dict[str, str] | None = None) -> str:
    """Spoken TTS text for a canonical reference (lang = en | te | hi)."""
    s = ref

    def tag(m: re.Match) -> str:
        letters = [LETTERS[lang][c] for c in m.group(1)]
        digits = [_w([EN_NUM[int(c)]], lang) for c in m.group(2)]
        tail = [LETTERS[lang][m.group(3)]] if m.group(3) else []
        return ' ' + ' '.join(letters + digits + tail) + ' '
    s = TAG_RE.sub(tag, s)
    s = re.sub(r'°\s?C', '°C', s)
    s = UNIT_RE.sub(lambda m: ' ' + UNIT_SPOKEN[lang][m.group(0).replace(' ', '')] + ' ', s)
    s = NUM_RE.sub(lambda m: ' ' + _w(en_words(m.group(1)), lang) + ' ', s)
    if word_map:
        s = re.sub(r'[A-Za-z]+', lambda m: word_map.get(m.group(0).lower(), m.group(0)), s)
    return re.sub(r'\s+', ' ', s).strip()


def native_ref(ref: str, word_map: dict[str, str]) -> str:
    """Reference with romanised words (code-mixed) written in native script; tags/numbers/units untouched."""
    keep = set()
    for m in TAG_RE.finditer(ref):
        keep.add(m.group(0))

    def rep(m: re.Match) -> str:
        w = m.group(0)
        if w in ('bar', 'rpm') or w in keep:
            return w
        return word_map.get(w.lower(), w)
    parts = re.split(r'(\b[A-Z]{1,4}-?\d{2,5}[A-Z]?\b|kg/cm2|m3/h)', ref)
    return ''.join(p if i % 2 else re.sub(r'[A-Za-z]+', rep, p) for i, p in enumerate(parts))


# ---------------------------------------------------------------- recognition side
_LETTER_LOOKUP: dict[str, str] = {}
for _lang in ('te', 'hi'):
    for _k, _v in LETTERS[_lang].items():
        _LETTER_LOOKUP[_v] = _k
    _LETTER_LOOKUP.update(LETTER_ALIASES[_lang])
_LETTER_LOOKUP.update(LETTER_ALIASES['en'])
_NUMWORD: dict[str, str] = {w: w for w in EN_NUM + list(EN_TENS) + ['hundred', 'thousand', 'point']}
for _lang in ('te', 'hi'):
    for _k, _v in TRANS[_lang].items():
        _NUMWORD[_v] = _k
    _NUMWORD.update(NUM_ALIASES[_lang])
_PHRASES = sorted(((p.lower(), tok) for tok, ps in UNIT_PHRASES.items() for p in ps), key=lambda x: -len(x[0]))


_NATIVE_LETTERS = sorted((k for k in _LETTER_LOOKUP if not k.isascii()), key=len, reverse=True)


def _split_letters(tok: str) -> list[str] | None:
    """Segment a run-together native spelling of letter names ('पीएस' -> ['P', 'S']); None if it is not one."""
    if tok.isascii() or tok in _LETTER_LOOKUP or tok in _NUMWORD or tok in NATIVE_DIGITS:
        return None
    best: dict[int, list[str]] = {0: []}
    for i in range(len(tok)):
        if i not in best:
            continue
        for name in _NATIVE_LETTERS:
            if tok.startswith(name, i) and i + len(name) not in best:
                best[i + len(name)] = best[i] + [_LETTER_LOOKUP[name]]
    out = best.get(len(tok))
    return out if out is not None and len(out) >= 2 else None


_POSTPOSITIONS = ('లో', 'కి', 'కు', 'ని', 'తో', 'ను', 'గా')


def _split_suffix(tok: str) -> list[str] | None:
    """Telugu postposition glued to a number word or letter name ('త్రీలో' -> ['త్రీ', 'లో']); None otherwise."""
    for suf in _POSTPOSITIONS:
        if tok.endswith(suf) and len(tok) > len(suf):
            stem = tok[: -len(suf)]
            if stem in _NUMWORD or stem in _LETTER_LOOKUP or stem in NATIVE_DIGITS:
                return [stem, suf]
            # number words ending in a virama/vowel sign change shape before the suffix: సెవెన్లో -> సెవెన్ + లో
            if stem + '\u0c4d' in _NUMWORD:
                return [stem + '\u0c4d', suf]
    return None


def _norm_text(s: str) -> str:
    s = unicodedata.normalize('NFC', s).replace('\u200c', '').replace('\u200d', '').replace('\u0964', ' ').replace('\u0965', ' ')
    return s.lower()


def _parse_number(words: list[str]) -> str | None:
    """English number words -> numeric string. Digit-by-digit runs concatenate."""
    if not words:
        return None
    if 'point' in words:
        i = words.index('point')
        a = _parse_number(words[:i]) if i else '0'
        b = ''.join(str(EN_NUM.index(w)) for w in words[i + 1:] if w in EN_NUM[:10])
        if a is None or not b:
            return a
        return f'{a}.{b}'
    if all(w in EN_NUM[:10] for w in words) and len(words) > 1:
        return ''.join(str(EN_NUM.index(w)) for w in words)
    total, cur = 0, 0
    for w in words:
        if w in EN_NUM:
            cur += EN_NUM.index(w)
        elif w in EN_TENS:
            cur += EN_TENS[w]
        elif w == 'hundred':
            cur = (cur or 1) * 100
        elif w == 'thousand':
            total += (cur or 1) * 1000
            cur = 0
    return str(total + cur)


def canonicalize(text: str) -> list[str]:
    """Canonical tokens: tags 'P101A', numbers '12.5', units 'bar|degc|m3h|kgcm2|pct|rpm', other words lowercased."""
    s = ' ' + _norm_text(text) + ' '
    for p, tok in _PHRASES:
        s = re.sub(r'(?<=[\s\d])' + re.escape(p) + r'(?=[\s.,;:!?)]|$)', f' <{tok}> ', s)
    s = re.sub(r'(\d)\s*<', r'\1 <', s)
    s = re.sub(r'(?<=\d),(?=\d{3}\b)', '', s)
    s = re.sub(r'(?<!\d)[.,;:!?"\'()\[\]{}]|[.,](?!\d)', ' ', s)
    s = re.sub(r'(?<=[a-z0-9])-(?=[a-z0-9])', '-', s)
    raw = []
    for t in s.split():
        if re.fullmatch(r'[a-z]+(-[a-z]+)+', t) and all(x in _NUMWORD for x in t.split('-')):
            raw.extend(t.split('-'))
        elif re.fullmatch(r'[a-z]{1,4}\d', t):
            raw.extend([t[:-1], t[-1]] if len(t) > 2 else [t[0], t[1]])
        elif _split_suffix(t):
            raw.extend(_split_suffix(t))
        elif _split_letters(t):
            raw.extend(c.lower() for c in _split_letters(t))
        else:
            raw.append(t)
    # classify
    items: list[tuple[str, str]] = []
    for idx, t in enumerate(raw):
        nxt = raw[idx + 1] if idx + 1 < len(raw) else ''
        if re.fullmatch(r'[a-z]{2,4}', t) and t not in _NUMWORD and t not in SHORT_WORDS and re.fullmatch(r'\d{2,5}[a-z]?', nxt):
            items.extend(('L', c.upper()) for c in t)
            continue
        m2 = re.fullmatch(r'(\d{2,5})([a-z])', t)
        if m2 and items and items[-1][0] == 'L':
            items.append(('D', m2.group(1)))
            items.append(('L', m2.group(2).upper()))
            continue
        if t.startswith('<') and t.endswith('>'):
            items.append(('U', t[1:-1]))
            continue
        m = re.fullmatch(r'([a-z]{1,4})-?(\d{2,5})([a-z]?)', t)
        if m:
            items.append(('T', (m.group(1) + m.group(2) + m.group(3)).upper()))
            continue
        if re.fullmatch(r'\d+(\.\d+)?', t):
            items.append(('D', t))
            continue
        if t in _NUMWORD:
            items.append(('W', _NUMWORD[t]))
            continue
        if t in NATIVE_DIGITS:
            items.append(('W', EN_NUM[NATIVE_DIGITS[t]]))
            continue
        if re.fullmatch(r'[a-z]', t):
            items.append(('L', t.upper()))
            continue
        if t in _LETTER_LOOKUP:
            items.append(('L', _LETTER_LOOKUP[t]))
            continue
        t2 = t.strip('-')
        if t2:
            items.append(('X', t2))
    # merge number-word runs and digit runs into numbers
    merged: list[tuple[str, str]] = []
    i = 0
    while i < len(items):
        k, v = items[i]
        if k == 'W':
            j = i
            ws = []
            while j < len(items) and items[j][0] == 'W':
                ws.append(items[j][1])
                j += 1
            n = _parse_number(ws)
            merged.append(('N', n) if n is not None else ('X', ' '.join(ws)))
            i = j
            continue
        if k == 'D':
            j = i
            ds = []
            while j < len(items) and items[j][0] == 'D' and len(ds) < 5:
                ds.append(items[j][1])
                j += 1
            if len(ds) > 1 and all(len(d) == 1 for d in ds):
                merged.append(('N', ''.join(ds)))
            else:
                merged.extend(('N', d) for d in ds)
            i = j
            continue
        merged.append((k, v))
        i += 1
    # assemble tags: L{1,4} N(int, 2-5 digits) [L]
    out: list[str] = []
    i = 0
    while i < len(merged):
        k, v = merged[i]
        if k == 'L':
            j = i
            letters = ''
            while j < len(merged) and merged[j][0] == 'L' and len(letters) < 4:
                letters += merged[j][1]
                j += 1
            if j < len(merged) and merged[j][0] == 'N' and re.fullmatch(r'\d{2,5}', merged[j][1] or ''):
                tag = letters + merged[j][1]
                j += 1
                if j < len(merged) and merged[j][0] == 'L' and (j + 1 >= len(merged) or merged[j + 1][0] != 'N'):
                    tag += merged[j][1]
                    j += 1
                out.append(tag)
                i = j
                continue
            out.extend(x for _, x in merged[i:j])
            i = j
            continue
        if k == 'T':
            if not v[-1].isalpha() and i + 1 < len(merged) and merged[i + 1][0] == 'L' and merged[i + 1][1] in 'ABCD' \
                    and (i + 2 >= len(merged) or merged[i + 2][0] != 'N'):
                v += merged[i + 1][1]
                i += 1
            out.append(v)
        elif k == 'N':
            out.append(_fmt_num(v))
        else:
            out.append(v.lower() if k != 'U' else v)
        i += 1
    return out


def _fmt_num(v: str) -> str:
    if '.' in v:
        v = v.rstrip('0').rstrip('.')
    return v.lstrip('0') or '0' if '.' not in v else v


def tags_of(tokens: list[str]) -> list[str]:
    return [t for t in tokens if re.fullmatch(r'[A-Z]{1,4}\d{2,5}[A-Z]?', t)]


def numbers_of(tokens: list[str]) -> list[str]:
    return [t for t in tokens if re.fullmatch(r'\d+(\.\d+)?', t)]


def ref_tags(ref: str) -> list[str]:
    return [(m.group(1) + m.group(2) + m.group(3)) for m in TAG_RE.finditer(ref)]


def ref_numbers(ref: str) -> list[str]:
    s = TAG_RE.sub(' ', ref)
    return [_fmt_num(m.group(1)) for m in NUM_RE.finditer(s)]


if __name__ == '__main__':
    tests = [
        ('P-101A యొక్క ప్రెషర్ 15.2 bar కి తగ్గించండి', 'te'),
        ('FV-2203 को 85 % खुले रखें, तापमान 150°C से अधिक न हो।', 'hi'),
        ('Set P-101A flow to 1500 m3/h and confirm pressure 3.2 bar.', 'en'),
    ]
    for r, l in tests:
        v = verbalize(r, l)
        print(r, '\n ->', v, '\n ref:', canonicalize(r), '\n spk:', canonicalize(v), ref_tags(r), ref_numbers(r))
    print(canonicalize('పి 101 ఏ లో ప్రెషర్ 15.2 బార్'), canonicalize('p101a pressure twelve point five bar, fv 2203 at seventy-five percent'))


_PUNCT = ' .,;:!?"\'()[]{}\u0964\u0965'
_TRAIL = r'[.,;:!?"\')\]}\u0964\u0965]+$'


def fold(text: str) -> str:
    """Text-preserving post-processor: spelled-out equipment tags (any script) become 'P-101A', and English
    number-word runs (Latin/Telugu/Devanagari spelling) of 2+ words, or 1 word right before a unit, become digits.
    Every other token keeps its original spelling and punctuation."""
    toks = []
    for t in unicodedata.normalize('NFC', text).split():
        core = _norm_text(t).strip(_PUNCT).strip()
        trail = re.search(_TRAIL, t)
        tail = trail.group(0) if trail else ''
        parts = _split_suffix(core) or ([x for x in _split_letters(core)] if _split_letters(core) else None)
        if parts:
            toks.extend(parts[:-1] + [parts[-1] + tail])
        else:
            toks.append(t)
    if not toks:
        return text.strip()
    keys = [_norm_text(t).strip(_PUNCT).strip() for t in toks]
    unit_starts = set()
    for i in range(len(keys)):
        for p, _ in _PHRASES:
            n = len(p.split())
            if ' '.join(keys[i:i + n]) == p:
                unit_starts.add(i)
                break

    def kind(i):
        k = keys[i]
        if re.fullmatch(r'\d+(\.\d+)?', k): return 'D', k
        if k in _NUMWORD: return 'W', _NUMWORD[k]
        if k in NATIVE_DIGITS: return 'W', EN_NUM[NATIVE_DIGITS[k]]
        if re.fullmatch(r'[a-z]', k): return 'L', k.upper()
        if k in _LETTER_LOOKUP: return 'L', _LETTER_LOOKUP[k]
        if re.fullmatch(r'[a-z]{2,4}', k) and k not in SHORT_WORDS and k not in _NUMWORD: return 'LL', k.upper()
        return 'X', k

    def number_run(i):
        """Longest number at i: returns (value, end_index, words_count) or None."""
        j = i; ws = []; ds = []
        while j < len(toks):
            kd, v = kind(j)
            if kd == 'W' and not ds: ws.append(v); j += 1
            elif kd == 'D' and not ws and len(v) == 1 and len(ds) < 5: ds.append(v); j += 1
            elif kd == 'D' and not ws and not ds: return v, j + 1, 1
            else: break
        if ws: return _parse_number(ws), j, len(ws)
        if ds: return ''.join(ds), j, len(ds)
        return None

    out = []; i = 0
    while i < len(toks):
        kd, v = kind(i)
        if kd in ('L', 'LL'):
            j = i; letters = ''
            while j < len(toks) and kind(j)[0] in ('L', 'LL') and len(letters) < 4:
                letters += kind(j)[1]; j += 1
            nr = number_run(j) if j < len(toks) else None
            if letters and len(letters) <= 4 and nr and re.fullmatch(r'\d{2,5}', nr[0] or ''):
                tag = f'{letters}-{nr[0]}'; j = nr[1]
                if j < len(toks) and kind(j)[0] == 'L' and (j + 1 >= len(toks) or number_run(j + 1) is None):
                    tag += kind(j)[1]; j += 1
                trail = re.search(_TRAIL, toks[j - 1]); out.append(tag + (trail.group(0) if trail else '')); i = j
                continue
        if kd == 'W':
            nr = number_run(i)
            if nr and nr[0] is not None and (nr[2] >= 2 or nr[1] in unit_starts):
                trail = re.search(_TRAIL, toks[nr[1] - 1]); out.append(_fmt_num(nr[0]) + (trail.group(0) if trail else '')); i = nr[1]
                continue
        out.append(toks[i]); i += 1
    return ' '.join(out)
