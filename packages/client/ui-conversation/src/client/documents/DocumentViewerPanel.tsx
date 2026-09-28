/**
 * DocumentViewerPanel: Center-column technical document/P&ID diagram viewer.
 * Replicates the CDU-03-001.pdf P&ID engineering schematic with zoom, pan, toolbar, and minimap.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/DocumentViewerPanel
 */

import { useState } from 'react'
import type { DocumentItem } from './types.ts'
import css from './DocumentViewerPanel.module.css'

export interface DocumentViewerPanelProps {
  readonly document: DocumentItem
  readonly onClose?: () => void
  readonly onDownload?: () => void
  readonly onOpenFullscreen?: () => void
}

export function DocumentViewerPanel({
  document,
  onClose,
  onDownload,
  onOpenFullscreen,
}: DocumentViewerPanelProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [panMode, setPanMode] = useState(true)

  const handleZoomIn = () => setZoom(z => Math.min(200, z + 15))
  const handleZoomOut = () => setZoom(z => Math.max(50, z - 15))

  return (
    <section className={css.viewerRoot} aria-label="Document Viewer">
      {/* 1. Header Bar */}
      <div className={css.viewerHeader}>
        <div className={css.headerLeft}>
          <h2 className={css.docTitle}>{document.name}</h2>
          <span className={css.typeBadge}>
            <span className={css.badgeDot} />
            {document.type}
          </span>
        </div>

        <button
          type="button"
          className={css.closeBtn}
          aria-label="Close document viewer"
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* 2. Sub-Toolbar */}
      <div className={css.toolbar}>
        {/* Page navigation */}
        <div className={css.toolbarGroup}>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className={css.pageIndicator}>
            {currentPage} / {document.pageCount}
          </span>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Next page"
            disabled={currentPage >= document.pageCount}
            onClick={() => setCurrentPage(p => Math.min(document.pageCount, p + 1))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Zoom controls & Pan tool */}
        <div className={css.toolbarGroup}>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Search inside document"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Zoom out"
            onClick={handleZoomOut}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className={css.zoomIndicator}>{zoom}%</span>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Zoom in"
            onClick={handleZoomIn}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <button
            type="button"
            className={`${css.toolBtn} ${panMode ? css.toolBtnActive : ''}`}
            aria-label="Pan tool"
            title="Toggle Pan Tool"
            onClick={() => setPanMode(!panMode)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v7M10 10.5V6a2 2 0 0 0-4 0v8M6 14v-1.5a2 2 0 0 0-4 0V16a8 8 0 0 0 16 0v-5a2 2 0 0 0-4 0" />
            </svg>
          </button>

          <button
            type="button"
            className={css.toolBtn}
            aria-label="Fullscreen"
            title="Expand to Fullscreen"
            onClick={onOpenFullscreen}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>

        {/* Right download/action buttons */}
        <div className={css.toolbarGroup}>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Download document"
            title="Download PDF"
            onClick={onDownload}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            type="button"
            className={css.toolBtn}
            aria-label="Export or share"
            title="Export"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          </button>
        </div>
      </div>

      {/* 3. Diagram Drawing Canvas */}
      <div className={css.canvasArea}>
        <svg
          className={css.diagramSvg}
          viewBox="0 0 700 620"
          style={{ transform: `scale(${zoom / 100})` }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Engineering Drawing Grids/Reference Borders */}
          <rect x="20" y="20" width="660" height="580" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />

          {/* MAIN TOWER: T-101 Crude Distillation Column */}
          {/* Top cap dome */}
          <path d="M 410 270 A 25 25 0 0 1 460 270" fill="none" stroke="#1e293b" strokeWidth="2.5" />
          {/* Vertical body walls */}
          <line x1="410" y1="270" x2="410" y2="470" stroke="#1e293b" strokeWidth="2.5" />
          <line x1="460" y1="270" x2="460" y2="470" stroke="#1e293b" strokeWidth="2.5" />
          {/* Bottom cap dome */}
          <path d="M 410 470 A 25 25 0 0 0 460 470" fill="none" stroke="#1e293b" strokeWidth="2.5" />
          {/* Column Skirt Support */}
          <line x1="410" y1="480" x2="410" y2="510" stroke="#475569" strokeWidth="2" />
          <line x1="460" y1="480" x2="460" y2="510" stroke="#475569" strokeWidth="2" />
          <line x1="400" y1="510" x2="470" y2="510" stroke="#475569" strokeWidth="2" />

          {/* Trays inside T-101 */}
          {[290, 310, 330, 350, 370, 390, 410, 430, 450].map((y, idx) => (
            <line
              key={y}
              x1={idx % 2 === 0 ? '415' : '425'}
              y1={y}
              x2={idx % 2 === 0 ? '445' : '455'}
              y2={y}
              stroke="#64748b"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          ))}

          {/* Tower Labels */}
          <text x="435" y="380" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
            T-101
          </text>
          <text x="435" y="395" textAnchor="middle" fontSize="9" fill="#475569">
            Crude
          </text>
          <text x="435" y="407" textAnchor="middle" fontSize="9" fill="#475569">
            Distillation
          </text>
          <text x="435" y="419" textAnchor="middle" fontSize="9" fill="#475569">
            Column
          </text>

          {/* OVERHEAD SYSTEM: Top Vapor line -> E-201 Overhead Condenser */}
          <path d="M 435 245 L 435 210 L 480 210" fill="none" stroke="#1e293b" strokeWidth="2" />

          {/* E-201 Overhead Condenser (Horizontal Shell & Tube) */}
          <rect x="480" y="200" width="70" height="26" rx="13" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
          <line x1="495" y1="200" x2="495" y2="226" stroke="#64748b" strokeWidth="1" />
          <line x1="535" y1="200" x2="535" y2="226" stroke="#64748b" strokeWidth="1" />
          <text x="515" y="190" textAnchor="middle" fontSize="10" fontWeight="600" fill="#0f172a">E-201</text>
          <text x="515" y="199" textAnchor="middle" fontSize="8" fill="#64748b">Overhead Condenser</text>

          {/* Line from E-201 to V-201 Reflux Drum */}
          <path d="M 550 213 L 575 213 L 575 270" fill="none" stroke="#1e293b" strokeWidth="2" />
          {/* Arrow */}
          <polygon points="575,245 572,238 578,238" fill="#1e293b" />

          {/* V-201 Reflux Drum (Vertical Vessel) */}
          <rect x="560" y="270" width="30" height="45" rx="10" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
          <text x="575" y="285" textAnchor="middle" fontSize="9" fontWeight="600" fill="#0f172a">V-201</text>
          <text x="575" y="295" textAnchor="middle" fontSize="7" fill="#64748b">Reflux Drum</text>
          {/* Liquid level */}
          <line x1="563" y1="300" x2="587" y2="300" stroke="#0284c7" strokeWidth="1" strokeDasharray="2 2" />

          {/* Reflux return line to T-101 */}
          <path d="M 575 315 L 575 340 L 460 340" fill="none" stroke="#1e293b" strokeWidth="1.5" />
          <polygon points="485,340 492,337 492,343" fill="#1e293b" />

          {/* Overhead Product: Naphtha */}
          <path d="M 590 290 L 630 290" fill="none" stroke="#1e293b" strokeWidth="2" />
          <polygon points="630,290 622,286 622,294" fill="#1e293b" />
          <text x="635" y="293" fontSize="9" fontWeight="600" fill="#0f172a">Naphtha</text>

          {/* SIDE DRAWS: Kerosene & Diesel */}
          {/* Kerosene Draw */}
          <path d="M 460 365 L 630 365" fill="none" stroke="#1e293b" strokeWidth="2" />
          <polygon points="630,365 622,361 622,369" fill="#1e293b" />
          <text x="635" y="368" fontSize="9" fontWeight="600" fill="#0f172a">Kerosene</text>

          {/* Diesel Draw */}
          <path d="M 460 415 L 630 415" fill="none" stroke="#1e293b" strokeWidth="2" />
          <polygon points="630,415 622,411 622,419" fill="#1e293b" />
          <text x="635" y="418" fontSize="9" fontWeight="600" fill="#0f172a">Diesel</text>

          {/* BOTTOM REBOILER SYSTEM: E-301 Reboiler & Bottoms */}
          <path d="M 435 495 L 435 520 L 490 520" fill="none" stroke="#1e293b" strokeWidth="2" />
          <rect x="490" y="505" width="55" height="30" rx="6" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
          <text x="517" y="520" textAnchor="middle" fontSize="9" fontWeight="600" fill="#0f172a">E-301</text>
          <text x="517" y="530" textAnchor="middle" fontSize="8" fill="#64748b">Reboiler</text>

          {/* Return from Reboiler */}
          <path d="M 545 520 L 565 520 L 565 470 L 460 470" fill="none" stroke="#1e293b" strokeWidth="1.5" />
          <polygon points="485,470 492,467 492,473" fill="#1e293b" />

          {/* Bottoms Product Out */}
          <path d="M 435 520 L 435 550 L 630 550" fill="none" stroke="#1e293b" strokeWidth="2" />
          <polygon points="630,550 622,546 622,554" fill="#1e293b" />
          <text x="635" y="553" fontSize="9" fontWeight="600" fill="#0f172a">Bottoms</text>

          {/* CRUDE FEED SYSTEM: Feed Line + P-101 A/B Feed Pump + Crude Preheater */}
          {/* Feed Pump P-101 A/B */}
          <circle cx="360" cy="510" r="14" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
          <polygon points="350,524 370,524 360,500" fill="none" stroke="#1e293b" strokeWidth="1.5" />
          <text x="360" y="538" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0f172a">P-101 A/B</text>
          <text x="360" y="549" textAnchor="middle" fontSize="8" fill="#64748b">Crude Feed Pump</text>

          {/* Feed Inlet Piping into Pump */}
          <path d="M 310 510 L 346 510" fill="none" stroke="#1e293b" strokeWidth="2" />
          <polygon points="335,510 327,506 327,514" fill="#1e293b" />

          {/* Pump Outlet -> Crude Preheater Exchanger */}
          <path d="M 360 496 L 360 440" fill="none" stroke="#1e293b" strokeWidth="2" />
          <polygon points="360,465 357,472 363,472" fill="#1e293b" />

          {/* Crude Preheater Heat Exchanger */}
          <circle cx="360" cy="420" r="18" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
          <path d="M 345 420 Q 352 410 360 420 T 375 420" fill="none" stroke="#1e293b" strokeWidth="1.5" />
          <text x="360" y="395" textAnchor="middle" fontSize="8" fontWeight="600" fill="#475569">Crude Preheater</text>

          {/* From Preheater into T-101 Column */}
          <path d="M 360 402 L 360 375 L 410 375" fill="none" stroke="#1e293b" strokeWidth="2" />
          <polygon points="405,375 397,371 397,379" fill="#1e293b" />

          {/* INSTRUMENTATION BALLOONS & CONTROL VALVES */}
          {/* PC (Pressure Controller) on overhead */}
          <circle cx="500" cy="155" r="10" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="490" y1="155" x2="510" y2="155" stroke="#1e293b" strokeWidth="1" />
          <text x="500" y="152" textAnchor="middle" fontSize="7" fontWeight="600" fill="#0f172a">PC</text>
          <line x1="500" y1="165" x2="500" y2="200" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />

          {/* FC (Flow Controller) on Feed */}
          <circle cx="330" cy="460" r="10" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="320" y1="460" x2="340" y2="460" stroke="#1e293b" strokeWidth="1" />
          <text x="330" y="457" textAnchor="middle" fontSize="7" fontWeight="600" fill="#0f172a">FC</text>
          <line x1="340" y1="460" x2="360" y2="460" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />

          {/* TC (Temperature Controller) on Column */}
          <circle cx="475" cy="445" r="10" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="465" y1="445" x2="485" y2="445" stroke="#1e293b" strokeWidth="1" />
          <text x="475" y="442" textAnchor="middle" fontSize="7" fontWeight="600" fill="#0f172a">TC</text>
          <line x1="465" y1="445" x2="460" y2="445" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />

          {/* LC (Level Controller) on Sump */}
          <circle cx="475" cy="495" r="10" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
          <line x1="465" y1="495" x2="485" y2="495" stroke="#1e293b" strokeWidth="1" />
          <text x="475" y="492" textAnchor="middle" fontSize="7" fontWeight="600" fill="#0f172a">LC</text>
          <line x1="465" y1="495" x2="460" y2="495" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />

          {/* Control Valve Symbols */}
          <polygon points="590,361 600,365 590,369" fill="#1e293b" />
          <polygon points="610,361 600,365 610,369" fill="#1e293b" />

          <polygon points="590,411 600,415 590,419" fill="#1e293b" />
          <polygon points="610,411 600,415 610,419" fill="#1e293b" />

          <polygon points="590,546 600,550 590,554" fill="#1e293b" />
          <polygon points="610,546 600,550 610,554" fill="#1e293b" />
        </svg>

        {/* Scale Bar in bottom left */}
        <div className={css.scaleBar}>
          <div className={css.scaleLabels}>
            <span>0</span>
            <span>5</span>
            <span>10</span>
            <span>20 m</span>
          </div>
          <div className={css.scaleRuler} />
        </div>

        {/* Minimap in bottom right */}
        <div className={css.minimap} aria-label="Diagram minimap">
          <svg className={css.minimapSvg} viewBox="0 0 700 620">
            <rect x="410" y="270" width="50" height="200" rx="25" fill="#94a3b8" />
            <rect x="480" y="200" width="70" height="26" rx="13" fill="#cbd5e1" />
            <circle cx="360" cy="510" r="14" fill="#cbd5e1" />
            <rect x="490" y="505" width="55" height="30" rx="6" fill="#cbd5e1" />
          </svg>
          <div className={css.minimapViewport} />
        </div>
      </div>
    </section>
  )
}
