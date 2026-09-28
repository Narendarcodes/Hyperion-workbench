import React, { useRef, useState } from 'react'
import { usePIDStore, pidStore } from './pidStore'
import css from './PIDViewer.module.css'

export const PIDViewer: React.FC = () => {
  const {
    selectedEquipment,
    activePIDTab,
    visibleLayers,
    zoomLevel,
    panOffset,
  } = usePIDStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof SVGElement && e.target.getAttribute('data-selectable') === 'true') {
      return // Don't trigger pan when clicking a component
    }
    setIsPanning(true)
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    pidStore.setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const scale = zoomLevel / 100
  const isP101Selected = selectedEquipment?.tag.includes('P-101')
  const isT101Selected = selectedEquipment?.tag === 'T-101'
  const isE101Selected = selectedEquipment?.tag === 'E-101'
  const isV201Selected = selectedEquipment?.tag === 'V-201'

  return (
    <div className={css.viewerCard}>
      {/* Top Toolbar */}
      <div className={css.toolbar}>
        <span className={css.demoNote} title="Vector demo rendering — not an MRPL as-built scan">
          Demo schematic · CDU-03
        </span>
        <div className={css.tabGroup}>
          <button
            type="button"
            className={`${css.tabBtn} ${activePIDTab === 'viewer' ? css.active : ''}`}
            onClick={() => {pidStore.setActivePIDTab('viewer') }}
          >
            P&ID Viewer
          </button>
          <button
            type="button"
            className={`${css.tabBtn} ${activePIDTab === 'layers' ? css.active : ''}`}
            onClick={() => {pidStore.setActivePIDTab('layers') }}
          >
            Layers
          </button>
          <button
            type="button"
            className={`${css.tabBtn} ${activePIDTab === 'equipment' ? css.active : ''}`}
            onClick={() => {pidStore.setActivePIDTab('equipment') }}
          >
            Equipment
          </button>
          <button
            type="button"
            className={`${css.tabBtn} ${activePIDTab === 'lines' ? css.active : ''}`}
            onClick={() => {pidStore.setActivePIDTab('lines') }}
          >
            Line List
          </button>
          <button
            type="button"
            className={`${css.tabBtn} ${activePIDTab === 'loops' ? css.active : ''}`}
            onClick={() => {pidStore.setActivePIDTab('loops') }}
          >
            Control Loops
          </button>
          <button
            type="button"
            className={`${css.tabBtn} ${activePIDTab === 'annotations' ? css.active : ''}`}
            onClick={() => {pidStore.setActivePIDTab('annotations') }}
          >
            Annotations
          </button>
        </div>

        <div className={css.controlsRight}>
          <div className={css.zoomPill}>
            <button
              type="button"
              className={css.zoomBtn}
              onClick={() => {pidStore.zoomOut() }}
              title="Zoom Out (-)"
            >
              -
            </button>
            <span className={css.zoomLabel}>{zoomLevel}%</span>
            <button
              type="button"
              className={css.zoomBtn}
              onClick={() => {pidStore.zoomIn() }}
              title="Zoom In (+)"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className={css.toolIconBtn}
            onClick={() => {pidStore.resetZoom() }}
            title="Reset Zoom / Fit to Screen"
          >
            Fit
          </button>

          <button
            type="button"
            className={css.toolIconBtn}
            onClick={() => {
              if (document.fullscreenElement) {
                void document.exitFullscreen()
              } else {
                void containerRef.current?.requestFullscreen()
              }
            }}
            title="Toggle Fullscreen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>

          <button
            type="button"
            className={css.toolIconBtn}
            title="Export P&ID Diagram Vector SVG"
            aria-label="Export P&ID diagram as SVG"
            onClick={() => {
              const svg = containerRef.current?.querySelector('svg')
              if (!svg) return
              const blob = new Blob(
                [new XMLSerializer().serializeToString(svg)],
                { type: 'image/svg+xml;charset=utf-8' },
              )
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = 'CDU-03-PID.svg'
              link.click()
              URL.revokeObjectURL(url)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Main SVG Vector Canvas */}
      <div
        ref={containerRef}
        className={css.canvasContainer}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg
          className={css.svgCanvas}
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${scale})`}>
            {/* Background Grid Pattern */}
            <defs>
              <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" opacity="0.6" />
              </pattern>
            </defs>
            <rect width="1000" height="600" fill="url(#gridPattern)" />

            {/* PROCESS LINES */}
            {visibleLayers.lines && (
              <g stroke="#334155" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                {/* 10"-CR-101 (Tank to P-101 A/B) */}
                <path d="M 60 480 L 140 480" stroke="#0284c7" strokeWidth="3" />
                <text x="80" y="472" fontSize="10" fill="#0284c7" fontWeight="600">10"-CR-101</text>

                {/* 10"-CR-102 (P-101 A/B to E-101) */}
                <path d="M 230 480 L 320 480 L 320 380" stroke={isP101Selected ? '#0284c7' : '#334155'} strokeWidth="3" />
                <text x="240" y="472" fontSize="10" fill="#475569" fontWeight="500">10"-CR-102</text>

                {/* 8"-CR-103 (E-101 to E-102 & E-103) */}
                <path d="M 380 340 L 460 340 L 460 260" stroke="#334155" strokeWidth="2.5" />
                <text x="390" y="332" fontSize="10" fill="#475569" fontWeight="500">8"-CR-103</text>

                {/* 8"-CR-104 (Preheat to Column T-101 Inlet) */}
                <path d="M 520 230 L 600 230 L 600 310" stroke="#334155" strokeWidth="2.5" />
                <text x="530" y="222" fontSize="10" fill="#475569" fontWeight="500">8"-CR-104</text>

                {/* Column Overhead Vapor Line to Condenser E-301 */}
                <path d="M 650 110 L 650 70 L 800 70 L 800 130" stroke="#334155" strokeWidth="2" strokeDasharray="4 2" />

                {/* Condenser E-301 Liquid to Reflux Drum V-201 */}
                <path d="M 800 190 L 800 260" stroke="#334155" strokeWidth="2.5" />

                {/* Reflux Return Line to T-101 Top */}
                <path d="M 760 290 L 710 290 L 710 180 L 680 180" stroke="#334155" strokeWidth="2" />

                {/* Column Bottoms Residue Line to Reboiler E-201 */}
                <path d="M 650 490 L 650 540 L 750 540 L 750 490" stroke="#334155" strokeWidth="2.5" />
              </g>
            )}

            {/* CONTROL LOOPS & INSTRUMENTATION */}
            {visibleLayers.loops && (
              <g stroke="#0284c7" strokeWidth="1" strokeDasharray="3 3">
                {/* Flow Control Loop for Crude Feed Pump */}
                <line x1="185" y1="480" x2="185" y2="410" />
                <circle cx="185" cy="395" r="14" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                <text x="185" y="399" fontSize="9" textAnchor="middle" fill="#0284c7" fontWeight="600">FIT-101</text>

                {/* Pressure Control Loop for Reflux Drum */}
                <line x1="800" y1="260" x2="870" y2="260" />
                <circle cx="885" cy="260" r="14" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                <text x="885" y="264" fontSize="9" textAnchor="middle" fill="#0284c7" fontWeight="600">PIC-301</text>
              </g>
            )}

            {/* PROCESS EQUIPMENT NODES */}

            {/* Crude Storage Tank Tank-01 */}
            <g transform="translate(10, 430)">
              <rect x="0" y="0" width="50" height="90" rx="4" fill="#f1f5f9" stroke="#475569" strokeWidth="2" />
              <text x="25" y="48" fontSize="10" textAnchor="middle" fill="#334155" fontWeight="600">Tank-01</text>
            </g>

            {/* P-101 A/B Crude Feed Pump (PRIMARY HIGHLIGHT TARGET) */}
            {visibleLayers.equipment && (
              <g
                transform="translate(140, 440)"
                cursor="pointer"
                data-selectable="true"
                onClick={() => {pidStore.setSelectedEquipmentById('P-101AB') }}
              >
                {/* Glow outline when selected */}
                {isP101Selected && (
                  <rect x="-10" y="-10" width="110" height="90" rx="12" fill="rgba(2, 132, 199, 0.08)" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 2" />
                )}

                {/* Pump Volute Casing Circle */}
                <circle cx="45" cy="40" r="30" fill={isP101Selected ? '#e0f2fe' : '#ffffff'} stroke={isP101Selected ? '#0284c7' : '#0f172a'} strokeWidth={isP101Selected ? '3' : '2'} />

                {/* Pump Impeller Symbol */}
                <path d="M 45 10 L 45 70 M 15 40 L 75 40" stroke={isP101Selected ? '#0284c7' : '#475569'} strokeWidth="1.5" />
                <polygon points="45,25 55,40 35,40" fill={isP101Selected ? '#0284c7' : '#475569'} />

                {/* Motor Drive Box */}
                <rect x="0" y="25" width="20" height="30" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
                <text x="10" y="44" fontSize="9" textAnchor="middle" fill="#0f172a" fontWeight="700">M</text>

                {/* Label Tag */}
                <rect x="10" y="76" width="70" height="20" rx="4" fill={isP101Selected ? '#0284c7' : '#ffffff'} stroke={isP101Selected ? '#0284c7' : '#cbd5e1'} strokeWidth="1" />
                <text x="45" y="90" fontSize="11" textAnchor="middle" fill={isP101Selected ? '#ffffff' : '#0f172a'} fontWeight="700">
                  P-101 A/B
                </text>
              </g>
            )}

            {/* Heat Exchanger E-101 */}
            {visibleLayers.equipment && (
              <g
                transform="translate(320, 310)"
                cursor="pointer"
                data-selectable="true"
                onClick={() => {pidStore.setSelectedEquipmentById('E-101') }}
              >
                {isE101Selected && (
                  <rect x="-8" y="-8" width="76" height="76" rx="10" fill="rgba(2, 132, 199, 0.08)" stroke="#0284c7" strokeWidth="2" />
                )}
                {/* Shell & Tube Exchanger Symbol */}
                <rect x="0" y="0" width="60" height="60" rx="30" fill={isE101Selected ? '#e0f2fe' : '#ffffff'} stroke={isE101Selected ? '#0284c7' : '#0f172a'} strokeWidth="2" />
                <path d="M 0 30 C 15 15, 45 45, 60 30" fill="none" stroke={isE101Selected ? '#0284c7' : '#334155'} strokeWidth="2" />
                <text x="30" y="-8" fontSize="11" textAnchor="middle" fill={isE101Selected ? '#0284c7' : '#0f172a'} fontWeight="700">
                  E-101
                </text>
              </g>
            )}

            {/* Heat Exchanger E-102 */}
            <g transform="translate(460, 200)">
              <rect x="0" y="0" width="60" height="60" rx="30" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
              <path d="M 0 30 C 15 15, 45 45, 60 30" fill="none" stroke="#334155" strokeWidth="2" />
              <text x="30" y="-8" fontSize="11" textAnchor="middle" fill="#0f172a" fontWeight="700">E-102</text>
            </g>

            {/* Main Crude Distillation Column T-101 */}
            {visibleLayers.equipment && (
              <g
                transform="translate(580, 110)"
                cursor="pointer"
                data-selectable="true"
                onClick={() => {pidStore.setSelectedEquipmentById('T-101') }}
              >
                {isT101Selected && (
                  <rect x="-10" y="-10" width="100" height="400" rx="16" fill="rgba(2, 132, 199, 0.08)" stroke="#0284c7" strokeWidth="2" />
                )}

                {/* Column Body Vessel */}
                <rect x="0" y="0" width="80" height="380" rx="40" fill={isT101Selected ? '#e0f2fe' : '#ffffff'} stroke={isT101Selected ? '#0284c7' : '#0f172a'} strokeWidth="2.5" />

                {/* Internal Trays Representation */}
                <line x1="10" y1="80" x2="70" y2="80" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="10" y1="140" x2="70" y2="140" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="10" y1="200" x2="70" y2="200" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="10" y1="260" x2="70" y2="260" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="10" y1="320" x2="70" y2="320" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />

                {/* Column Tag Title */}
                <rect x="-10" y="180" width="100" height="24" rx="4" fill={isT101Selected ? '#0284c7' : '#0f172a'} />
                <text x="40" y="196" fontSize="12" textAnchor="middle" fill="#ffffff" fontWeight="700">
                  T-101
                </text>
              </g>
            )}

            {/* Overhead Condenser E-301 */}
            <g transform="translate(760, 130)">
              <rect x="0" y="0" width="80" height="60" rx="6" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
              <path d="M 10 10 L 70 50 M 10 50 L 70 10" stroke="#94a3b8" strokeWidth="1.5" />
              <text x="40" y="-8" fontSize="11" textAnchor="middle" fill="#0f172a" fontWeight="700">E-301</text>
            </g>

            {/* Reflux Drum V-201 */}
            {visibleLayers.equipment && (
              <g
                transform="translate(760, 260)"
                cursor="pointer"
                data-selectable="true"
                onClick={() => {pidStore.setSelectedEquipmentById('V-201') }}
              >
                {isV201Selected && (
                  <rect x="-8" y="-8" width="96" height="66" rx="10" fill="rgba(2, 132, 199, 0.08)" stroke="#0284c7" strokeWidth="2" />
                )}
                <rect x="0" y="0" width="80" height="50" rx="25" fill={isV201Selected ? '#e0f2fe' : '#ffffff'} stroke={isV201Selected ? '#0284c7' : '#0f172a'} strokeWidth="2" />
                <text x="40" y="30" fontSize="11" textAnchor="middle" fill={isV201Selected ? '#0284c7' : '#0f172a'} fontWeight="700">
                  V-201
                </text>
              </g>
            )}

            {/* Reboiler E-201 */}
            <g transform="translate(720, 460)">
              <rect x="0" y="0" width="60" height="60" rx="30" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
              <path d="M 0 30 C 15 15, 45 45, 60 30" fill="none" stroke="#334155" strokeWidth="2" />
              <text x="30" y="76" fontSize="11" textAnchor="middle" fill="#0f172a" fontWeight="700">E-201</text>
            </g>

            {/* ANNOTATIONS */}
            {visibleLayers.annotations && (
              <g>
                <rect x="60" y="30" width="220" height="65" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                <text x="70" y="48" fontSize="11" fill="#0284c7" fontWeight="700">CDU-03-001 P&ID DIAGRAM</text>
                <text x="70" y="64" fontSize="10" fill="#64748b">Crude Distillation & Preheat Train</text>
                <text x="70" y="80" fontSize="9" fill="#94a3b8">Rev: 04 · Status: Approved for Ops</text>
              </g>
            )}
          </g>
        </svg>

        {/* Bottom-Right Inset Minimap */}
        <div className={css.minimap}>
          <div className={css.minimapTitle}>Minimap Overview</div>
          <svg className={css.minimapSvg} viewBox="0 0 1000 600">
            <rect width="1000" height="600" fill="#f8fafc" />
            <path d="M 60 480 L 320 480 L 320 380 M 380 340 L 460 340 M 520 230 L 600 230 L 600 310" stroke="#cbd5e1" strokeWidth="8" fill="none" />
            <circle cx="185" cy="480" r="40" fill="#0284c7" />
            <rect x="580" y="110" width="80" height="380" rx="40" fill="#64748b" />
            <rect x="760" y="260" width="80" height="50" rx="25" fill="#64748b" />
            {/* Viewport Indicator Rectangle */}
            <rect x="80" y="60" width="600" height="400" className={css.minimapViewport} />
          </svg>
        </div>
      </div>
    </div>
  )
}
