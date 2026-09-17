/**
 * TopDownFurniture: SVG elements for warm, detailed pixel-art office workstations, rooms, and decor.
 * @module @deepseek-ai/dsh-client-ui-mission/client/TopDownFurniture
 */

/** Props for a top-down workstation desk with monitor, chair, and station props. */
export interface WorkstationProps {
  readonly x: number
  readonly y: number
  readonly label: string
  readonly role: string
  readonly stationId: string
  readonly isOccupied?: boolean | undefined
  readonly isWorking?: boolean | undefined
  readonly statusDotColor?: string | undefined
}

/**
 * Top-down Workstation Desk component with dual monitors, desk surface, and role pill.
 *
 * @param props - Station parameters.
 * @returns SVG group rendering workstation.
 */
export function Workstation({
  x,
  y,
  label,
  role,
  stationId,
  isOccupied = false,
  isWorking = false,
  statusDotColor = '#10b981',
}: WorkstationProps) {
  const w = 110
  const h = 55
  const deskX = x - w / 2
  const deskY = y - h / 2

  // Screen content glow colors based on station
  const screenColor = stationId === 'documents'
    ? '#38bdf8'
    : stationId === 'knowledge'
      ? '#34d399'
      : stationId === 'analysis'
        ? '#fbbf24'
        : stationId === 'code'
          ? '#22c55e'
          : stationId === 'verification'
            ? '#f87171'
            : '#818cf8'

  return (
    <g className="station-workstation" data-station={stationId}>
      {/* 1. Station Area Partition Mat */}
      <rect
        x={deskX - 16}
        y={deskY - 32}
        width={w + 32}
        height={h + 60}
        rx={6}
        fill="#e8dec8"
        fillOpacity={0.65}
        stroke="#c4b59d"
        strokeWidth={1}
      />

      {/* 2. Station Title Banner on Room Floor */}
      <text
        x={x}
        y={deskY - 14}
        textAnchor="middle"
        fill="#1e293b"
        fontSize={10}
        fontFamily="sans-serif"
        fontWeight={800}
        letterSpacing={0.5}
      >
        {label}
      </text>

      {/* 3. Chair Behind Desk */}
      <rect
        x={x - 14}
        y={deskY + h - 6}
        width={28}
        height={14}
        rx={4}
        fill="#334155"
        stroke="#1e293b"
        strokeWidth={1}
      />
      <circle cx={x} cy={deskY + h + 2} r={6} fill="#475569" />

      {/* 4. Wooden Desk Surface */}
      <rect
        x={deskX}
        y={deskY}
        width={w}
        height={h}
        rx={3}
        fill="#b88352"
        stroke="#8b5523"
        strokeWidth={1.5}
      />
      {/* Desk Inset Pad */}
      <rect
        x={deskX + 6}
        y={deskY + 5}
        width={w - 12}
        height={h - 10}
        rx={2}
        fill="#9e6e42"
      />

      {/* 5. Dual Monitors / Computers */}
      {/* Main Monitor */}
      <rect
        x={x - 24}
        y={deskY + 8}
        width={32}
        height={16}
        rx={1}
        fill="#0f172a"
        stroke="#475569"
        strokeWidth={1}
      />
      <rect
        x={x - 22}
        y={deskY + 10}
        width={28}
        height={12}
        fill={isWorking ? '#020617' : '#1e293b'}
      />
      {/* Screen Lines / Data visualization */}
      {isWorking && (
        <g transform={`translate(${x - 20}, ${deskY + 12})`}>
          <line x1={0} y1={2} x2={16} y2={2} stroke={screenColor} strokeWidth={1.5} />
          <line x1={0} y1={5} x2={22} y2={5} stroke={screenColor} strokeWidth={1.5} />
          <line x1={0} y1={8} x2={12} y2={8} stroke={screenColor} strokeWidth={1.5} />
        </g>
      )}

      {/* Secondary Monitor */}
      <rect
        x={x + 12}
        y={deskY + 10}
        width={20}
        height={14}
        rx={1}
        fill="#0f172a"
        stroke="#475569"
        strokeWidth={0.8}
      />
      <rect
        x={x + 14}
        y={deskY + 12}
        width={16}
        height={10}
        fill={isWorking ? screenColor : '#1e293b'}
        fillOpacity={isWorking ? 0.7 : 1}
      />

      {/* Keyboard & Mouse */}
      <rect
        x={x - 18}
        y={deskY + 28}
        width={26}
        height={9}
        rx={1}
        fill="#1e293b"
        stroke="#475569"
        strokeWidth={0.5}
      />
      <circle cx={x + 16} cy={deskY + 32} r={2.5} fill="#334155" />

      {/* Desk Props (Paper stack or coffee mug) */}
      <rect x={deskX + 8} y={deskY + 26} width={10} height={12} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={0.5} />
      <circle cx={deskX + 13} cy={deskY + 12} r={3} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={0.5} />

      {/* 6. Role Badge Pill Below Desk */}
      <g transform={`translate(${x}, ${deskY + h + 18})`}>
        <rect
          x={-55}
          y={-9}
          width={110}
          height={18}
          rx={9}
          fill="#1e293b"
          stroke="#334155"
          strokeWidth={1}
        />
        {/* Status Dot */}
        <circle cx={-44} cy={0} r={3.5} fill={isOccupied ? statusDotColor : '#64748b'} />
        {/* Role Name */}
        <text
          x={-35}
          y={3.5}
          fill="#f8fafc"
          fontSize={8.5}
          fontFamily="sans-serif"
          fontWeight={600}
        >
          {role}
        </text>
      </g>
    </g>
  )
}

/** Props for Orchestrator Dais. */
export interface OrchestratorDaisProps {
  readonly x: number
  readonly y: number
  readonly w?: number | undefined
  readonly h?: number | undefined
  readonly isGlowing?: boolean | undefined
  readonly titleLabel?: string | undefined
}

/**
 * Orchestrator Dais podium with crystal holographic orb and control console.
 *
 * @param props - Dais parameters.
 * @returns SVG group rendering orchestrator podium.
 */
export function OrchestratorDais({
  x,
  y,
  w = 180,
  h = 75,
  isGlowing = true,
  titleLabel = 'HYPERION ORCHESTRATOR',
}: OrchestratorDaisProps) {
  return (
    <g className="orchestrator-dais" transform={`translate(${x - w / 2}, ${y - h / 2})`}>
      {/* Dais Base Platform */}
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={8}
        fill="#1e293b"
        stroke={isGlowing ? '#6366f1' : '#475569'}
        strokeWidth={isGlowing ? 2 : 1.5}
      />
      {/* Inner Raised Tier */}
      <rect
        x={8}
        y={6}
        width={w - 16}
        height={h - 12}
        rx={5}
        fill="#0f172a"
        stroke="#334155"
        strokeWidth={1}
      />

      {/* Control Console */}
      <rect
        x={w / 2 - 35}
        y={h - 18}
        width={70}
        height={12}
        rx={2}
        fill="#1e293b"
        stroke="#64748b"
        strokeWidth={0.8}
      />
      <circle cx={w / 2 - 15} cy={h - 12} r={2} fill="#38bdf8" />
      <circle cx={w / 2} cy={h - 12} r={2} fill="#a855f7" />
      <circle cx={w / 2 + 15} cy={h - 12} r={2} fill="#34d399" />

      {/* Dais Title Plaque */}
      <g transform={`translate(${w / 2}, -4)`}>
        <rect
          x={-68}
          y={-10}
          width={136}
          height={18}
          rx={4}
          fill="#0f172a"
          stroke="#6366f1"
          strokeWidth={1.2}
        />
        <text
          x={0}
          y={2.5}
          textAnchor="middle"
          fill="#e0e7ff"
          fontSize={8.5}
          fontFamily="sans-serif"
          fontWeight={800}
          letterSpacing={0.8}
        >
          {titleLabel}
        </text>
      </g>
    </g>
  )
}

/** Potted Ficus Plant. */
export function PottedPlant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={6} r={9} fill="#000000" fillOpacity={0.25} />
      <circle cx={0} cy={0} r={8} fill="#b45309" stroke="#78350f" strokeWidth={1} />
      <circle cx={0} cy={0} r={6} fill="#3f2305" />
      {/* Leaves */}
      <circle cx={-3} cy={-3} r={5} fill="#15803d" />
      <circle cx={3} cy={-3} r={5} fill="#22c55e" />
      <circle cx={0} cy={2} r={5} fill="#16a34a" />
      <circle cx={0} cy={-2} r={4} fill="#4ade80" />
    </g>
  )
}

/** Tall Wooden Bookshelf. */
export function Bookshelf({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={34} height={60} rx={2} fill="#8b5a2b" stroke="#5c3a1e" strokeWidth={1.2} />
      {/* Shelves with books */}
      <rect x={3} y={8} width={28} height={2} fill="#5c3a1e" />
      <rect x={4} y={3} width={5} height={5} fill="#ef4444" />
      <rect x={10} y={2} width={6} height={6} fill="#3b82f6" />
      <rect x={17} y={3} width={4} height={5} fill="#eab308" />
      <rect x={22} y={2} width={6} height={6} fill="#10b981" />

      <rect x={3} y={24} width={28} height={2} fill="#5c3a1e" />
      <rect x={4} y={17} width={6} height={7} fill="#8b5cf6" />
      <rect x={11} y={18} width={5} height={6} fill="#f97316" />
      <rect x={17} y={17} width={6} height={7} fill="#06b6d4" />
      <rect x={24} y={18} width={4} height={6} fill="#ec4899" />

      <rect x={3} y={42} width={28} height={2} fill="#5c3a1e" />
      <rect x={4} y={34} width={5} height={8} fill="#3b82f6" />
      <rect x={10} y={35} width={6} height={7} fill="#10b981" />
      <rect x={17} y={34} width={7} height={8} fill="#ef4444" />
      <rect x={25} y={35} width={4} height={7} fill="#eab308" />
    </g>
  )
}

/** Server Rack Cabinet with blinking LEDs. */
export function ServerRack({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={28} height={42} rx={2} fill="#0f172a" stroke="#334155" strokeWidth={1.2} />
      <rect x={3} y={4} width={22} height={8} rx={1} fill="#1e293b" />
      <circle cx={7} cy={8} r={1.5} fill="#22c55e" />
      <circle cx={12} cy={8} r={1.5} fill="#22c55e" />
      <circle cx={17} cy={8} r={1.5} fill="#38bdf8" />

      <rect x={3} y={15} width={22} height={8} rx={1} fill="#1e293b" />
      <circle cx={7} cy={19} r={1.5} fill="#22c55e" />
      <circle cx={12} cy={19} r={1.5} fill="#38bdf8" />
      <circle cx={17} cy={19} r={1.5} fill="#22c55e" />

      <rect x={3} y={26} width={22} height={8} rx={1} fill="#1e293b" />
      <circle cx={7} cy={30} r={1.5} fill="#38bdf8" />
      <circle cx={12} cy={30} r={1.5} fill="#a855f7" />
      <circle cx={17} cy={30} r={1.5} fill="#22c55e" />
    </g>
  )
}

/** Break Lounge Area. */
export function BreakLounge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Lounge Label */}
      <text x={50} y={-8} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="sans-serif" fontWeight={700}>
        LOUNGE
      </text>

      {/* Blue Couch */}
      <rect x={0} y={0} width={65} height={26} rx={4} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1} />
      <rect x={3} y={4} width={59} height={12} rx={2} fill="#3b82f6" />
      <rect x={2} y={16} width={18} height={8} rx={2} fill="#1d4ed8" />
      <rect x={23} y={16} width={18} height={8} rx={2} fill="#1d4ed8" />
      <rect x={44} y={16} width={18} height={8} rx={2} fill="#1d4ed8" />

      {/* Coffee Table */}
      <circle cx={32} cy={42} r={14} fill="#b88352" stroke="#8b5523" strokeWidth={1} />
      <circle cx={28} cy={40} r={2.5} fill="#ffffff" />
      <circle cx={36} cy={44} r={2.5} fill="#ef4444" />

      {/* Sleeping Cat */}
      <ellipse cx={58} cy={44} rx={6} ry={4.5} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.8} />
      <circle cx={62} cy={42} r={3} fill="#e2e8f0" />

      {/* Water Cooler */}
      <rect x={80} y={10} width={14} height={24} rx={2} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1} />
      <rect x={82} y={0} width={10} height={10} rx={2} fill="#38bdf8" fillOpacity={0.8} />
      <rect x={84} y={16} width={6} height={6} fill="#0284c7" />
    </g>
  )
}

/** Mission Control Wall Posters & Decor (Top Left). */
export function MissionControlWall({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Poster 1: Hyperion Mission Control */}
      <rect x={0} y={0} width={80} height={42} rx={2} fill="#f8fafc" stroke="#64748b" strokeWidth={1} />
      <text x={40} y={10} textAnchor="middle" fill="#0f172a" fontSize={6} fontFamily="sans-serif" fontWeight={800}>
        HYPERION
      </text>
      <text x={40} y={17} textAnchor="middle" fill="#2563eb" fontSize={4.5} fontFamily="sans-serif" fontWeight={700}>
        MISSION CONTROL
      </text>
      <text x={40} y={26} textAnchor="middle" fill="#64748b" fontSize={3.8} fontFamily="sans-serif">
        TURN COMPLEX WORK
      </text>
      <text x={40} y={32} textAnchor="middle" fill="#64748b" fontSize={3.8} fontFamily="sans-serif">
        INTO REAL OUTCOMES
      </text>

      {/* Poster 2: Landscape Poster */}
      <rect x={90} y={0} width={40} height={42} rx={2} fill="#f8fafc" stroke="#64748b" strokeWidth={1} />
      <rect x={92} y={3} width={36} height={24} fill="#38bdf8" />
      <polygon points="96,27 106,12 116,27" fill="#059669" />
      <polygon points="106,27 116,16 124,27" fill="#047857" />
      <text x={110} y={34} textAnchor="middle" fill="#0f172a" fontSize={3.5} fontFamily="sans-serif" fontWeight={700}>
        SAFER INDUSTRY
      </text>
      <text x={110} y={39} textAnchor="middle" fill="#0f172a" fontSize={3.5} fontFamily="sans-serif">
        BRIGHTER TOMORROW
      </text>
    </g>
  )
}

/** Whiteboard Diagram (Analysis zone). */
export function AnalysisWhiteboard({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={38} height={32} rx={2} fill="#ffffff" stroke="#94a3b8" strokeWidth={1} />
      {/* Flowchart Boxes & Arrows */}
      <rect x={6} y={5} width={10} height={6} rx={1} fill="#3b82f6" />
      <line x1={16} y1={8} x2={22} y2={8} stroke="#64748b" strokeWidth={1} />
      <rect x={22} y={5} width={10} height={6} rx={1} fill="#10b981" />
      <line x1={27} y1={11} x2={27} y2={18} stroke="#64748b" strokeWidth={1} />
      <rect x={20} y={18} width={14} height={6} rx={1} fill="#f59e0b" />
    </g>
  )
}
/** Props for PersonalCabin. */
export interface PersonalCabinProps {
  readonly x: number
  readonly y: number
  readonly w?: number | undefined
  readonly h?: number | undefined
  readonly cabinNumber: number
  readonly label: string
  readonly status?: string | undefined
  readonly isOccupied?: boolean | undefined
}

/**
 * Top-down personal agent cabin featuring dynamic task title, private desk, PC, and status dot.
 */
export function PersonalCabin({
  x,
  y,
  w = 125,
  h = 95,
  cabinNumber,
  label,
  status = 'working',
  isOccupied = false,
}: PersonalCabinProps) {
  const deskW = 70
  const deskH = 34
  const deskX = x + (w - deskW) / 2
  const deskY = y + 34

  const statusColor = status === 'blocked' || status === 'failed'
    ? '#ef4444'
    : status === 'verifying' || status === 'waiting'
      ? '#f59e0b'
      : status === 'searching'
        ? '#0284c7'
        : status === 'completed'
          ? '#8b5cf6'
          : '#10b981'

  // ponytail: plaque fits ~15 chars at 7.5px; longer titles clip into the
  // neighboring cabin, so truncate here instead of a clipPath (which resolves
  // in the translated header group's user space, not cabin space).
  const displayTitle = label && label.trim().length > 0
    ? (label.length > 15 ? `${label.slice(0, 14)}…` : label)
    : `Specialist 0${cabinNumber}`

  return (
    <g className="personal-cabin" data-cabin={`cabin-${cabinNumber}`}>
      {/* 1. Cabin Carpet / Partition Floor */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill="#f8fafc"
        fillOpacity={0.92}
        stroke="#cbd5e1"
        strokeWidth={1.5}
      />
      {/* Glass / Half-Wall Top Rail */}
      <line x1={x} y1={y + 24} x2={x + w} y2={y + 24} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 2" />

      {/* 2. Cabin Header Plaque */}
      <g transform={`translate(${x + 6}, ${y + 4})`}>
        {/* Number Badge */}
        <rect x={0} y={0} width={42} height={15} rx={3} fill="#0f172a" />
        <text x={21} y={10.5} textAnchor="middle" fill="#38bdf8" fontSize={7} fontFamily="monospace" fontWeight={800}>
          {`CABIN ${cabinNumber < 10 ? `0${cabinNumber}` : cabinNumber}`}
        </text>
        {/* Dynamic Task Title */}
        <text x={48} y={11} fill="#1e293b" fontSize={7.5} fontFamily="sans-serif" fontWeight={700}>
          {displayTitle}
        </text>
      </g>

      {/* 3. Office Chair */}
      <rect
        x={x + w / 2 - 10}
        y={deskY + deskH - 4}
        width={20}
        height={10}
        rx={3}
        fill="#334155"
        stroke="#1e293b"
        strokeWidth={0.8}
      />
      <circle cx={x + w / 2} cy={deskY + deskH + 2} r={4.5} fill="#475569" />

      {/* 4. Wooden Desk */}
      <rect
        x={deskX}
        y={deskY}
        width={deskW}
        height={deskH}
        rx={3}
        fill="#b88352"
        stroke="#8b5523"
        strokeWidth={1.2}
      />
      <rect
        x={deskX + 4}
        y={deskY + 3}
        width={deskW - 8}
        height={deskH - 6}
        rx={2}
        fill="#9e6e42"
      />

      {/* 5. PC Monitor with Status Screen */}
      <rect
        x={x + w / 2 - 14}
        y={deskY + 5}
        width={28}
        height={12}
        rx={1}
        fill="#0f172a"
        stroke="#334155"
        strokeWidth={0.8}
      />
      <rect
        x={x + w / 2 - 12}
        y={deskY + 6.5}
        width={24}
        height={8.5}
        fill={isOccupied ? '#0284c7' : '#1e293b'}
      />
      {/* Keyboard */}
      <rect
        x={x + w / 2 - 10}
        y={deskY + 20}
        width={20}
        height={5}
        rx={0.8}
        fill="#1e293b"
      />
      {/* Coffee Mug */}
      <circle cx={deskX + deskW - 8} cy={deskY + 10} r={2.5} fill="#ef4444" />

      {/* 6. Status Pill at Bottom */}
      <g transform={`translate(${x + w / 2}, ${y + h - 7})`}>
        <circle cx={-20} cy={-2.5} r={2.5} fill={statusColor} />
        <text
          x={-14}
          y={0}
          fill="#475569"
          fontSize={6}
          fontFamily="sans-serif"
          fontWeight={600}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </text>
      </g>
    </g>
  )
}

/** Testing Lab Bench & Diagnostics Rack. */
export function TestingEquipment({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={36} height={28} rx={2} fill="#0f172a" stroke="#475569" strokeWidth={1} />
      <rect x={3} y={4} width={30} height={10} rx={1} fill="#1e293b" />
      {/* Oscilloscope wave */}
      <polyline points="5,9 11,5 17,13 23,7 29,9" fill="none" stroke="#22c55e" strokeWidth={1} />
      {/* Telemetry LEDs */}
      <circle cx={8} cy={20} r={2} fill="#38bdf8" />
      <circle cx={18} cy={20} r={2} fill="#22c55e" />
      <circle cx={28} cy={20} r={2} fill="#f59e0b" />
    </g>
  )
}
