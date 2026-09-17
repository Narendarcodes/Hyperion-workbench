/**
 * HyperionOffice: Top-down pixel-art living office simulation matching the visual reference.
 * @module @deepseek-ai/dsh-client-ui-mission/client/HyperionOffice
 */

import { useMemo } from 'react'
import type { MissionOfficeState } from './mission-contract.ts'
import {
  getCabinGeometry,
  OFFICE_DIMENSIONS,
  OFFICE_STATIONS,
  ORCHESTRATOR_GEOMETRY,
  PLANT_LOCATIONS,
} from './office-layout.ts'
import {
  AnalysisWhiteboard,
  Bookshelf,
  BreakLounge,
  MissionControlWall,
  OrchestratorDais,
  PersonalCabin,
  PottedPlant,
  ServerRack,
  TestingEquipment,
  Workstation,
} from './TopDownFurniture.tsx'
import { BehaviorBubble } from './BehaviorBubble.tsx'
import { WorkerFigure } from './WorkerFigure.tsx'
import { useOfficeVisualDriver } from './visual-driver.ts'
import type { MissionTranslate } from './locales.ts'
import css from './HyperionOffice.module.css'

/** Props for HyperionOffice. */
export interface HyperionOfficeProps {
  readonly officeState: MissionOfficeState
  readonly hasPendingVerification?: boolean | undefined
  readonly reducedMotion?: boolean | undefined
  readonly t?: MissionTranslate | undefined
}

/**
 * Hyperion Office Simulation SVG Canvas matching the reference visual design.
 *
 * @param props - Office state, verification highlight, and animation settings.
 * @returns SVG element rendering top-down simulation.
 */
export function HyperionOffice({
  officeState,
  hasPendingVerification = false,
  reducedMotion = false,
  t,
}: HyperionOfficeProps) {
  const { orchestrator, workers, activeBubbles } = useOfficeVisualDriver(officeState, reducedMotion)

  // Map occupied stations by station id
  const occupiedStations = useMemo(() => {
    const map = new Map<string, { count: number; isWorking: boolean; statusDotColor: string }>()
    for (const w of officeState.workers) {
      const isWorking = w.status === 'working' || w.status === 'searching' || w.status === 'executing'
      const statusDotColor = w.status === 'blocked'
        ? '#ef4444'
        : w.status === 'verifying'
          ? '#f59e0b'
          : w.status === 'searching'
            ? '#0284c7'
            : '#10b981'
      map.set(w.station, {
        count: (map.get(w.station)?.count ?? 0) + 1,
        isWorking,
        statusDotColor,
      })
    }
    return map
  }, [officeState.workers])

  const cabinsToRender = useMemo(() => {
    if (officeState.cabins && officeState.cabins.length > 0) {
      return officeState.cabins
    }
    return officeState.workers.map((w, idx) => ({
      id: w.cabinId ?? `cabin-${idx + 1}`,
      agentId: w.id,
      label: w.label || `Specialist 0${idx + 1}`,
      status: w.status,
      seatIndex: idx + 1,
    }))
  }, [officeState.cabins, officeState.workers])
  const ariaLabel = t ? t('simulation.aria') : ''
  const coreLabel = t ? t('core.label') : ''

  return (
    <div className={css.officeContainer} data-mission-office>
      <svg
        className={css.officeSvg}
        viewBox={`0 0 ${OFFICE_DIMENSIONS.width} ${OFFICE_DIMENSIONS.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          {/* Parquet wooden floor texture */}
          <pattern id="woodParquet" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="#e2c09b" />
            <line x1="0" y1="15" x2="30" y2="15" stroke="#d4ab82" strokeWidth="1" />
            <line x1="15" y1="0" x2="15" y2="30" stroke="#d4ab82" strokeWidth="1" />
            <line x1="0" y1="0" x2="30" y2="0" stroke="#c89d70" strokeWidth="1" />
            <line x1="0" y1="30" x2="30" y2="30" stroke="#c89d70" strokeWidth="1" />
          </pattern>
          {/* Hologram dais glow */}
          <radialGradient id="hologramOrbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#6366f1" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. ROOM SHELL & WOOD PARQUET FLOOR */}
        <rect
          x={OFFICE_DIMENSIONS.floor.x}
          y={OFFICE_DIMENSIONS.floor.y}
          width={OFFICE_DIMENSIONS.floor.w}
          height={OFFICE_DIMENSIONS.floor.h}
          rx={8}
          fill="url(#woodParquet)"
          stroke="#475569"
          strokeWidth={4}
        />

        {/* Top Wall & Large Glass Windows */}
        <rect x={20} y={20} width={920} height={20} fill="#334155" />
        <rect x={180} y={23} width={120} height={14} rx={2} fill="#bae6fd" fillOpacity={0.45} stroke="#38bdf8" strokeWidth={1} />
        <rect x={660} y={23} width={120} height={14} rx={2} fill="#bae6fd" fillOpacity={0.45} stroke="#38bdf8" strokeWidth={1} />

        {/* Room Dividers / Interior Glass Walls */}
        <line x1={20} y1={120} x2={340} y2={120} stroke="#64748b" strokeWidth={2.5} />
        <line x1={620} y1={120} x2={940} y2={120} stroke="#64748b" strokeWidth={2.5} />
        <line x1={770} y1={120} x2={770} y2={30} stroke="#64748b" strokeWidth={2.5} />
        <line x1={870} y1={120} x2={870} y2={580} stroke="#64748b" strokeWidth={2.5} />

        {/* 2. TOP LEFT: HYPERION MISSION CONTROL WALL & SOFA */}
        <MissionControlWall x={50} y={48} />
        {/* Blue Waiting Sofa */}
        <rect x={250} y={60} width={55} height={22} rx={3} fill="#2563eb" stroke="#1d4ed8" strokeWidth={1} />
        <rect x={252} y={63} width={51} height={10} rx={1} fill="#3b82f6" />

        {/* 3. TOP RIGHT: BREAK LOUNGE */}
        <BreakLounge x={785} y={45} />

        {/* 4. FAR RIGHT: EXIT HALLWAY & SIGN */}
        <g transform="translate(885, 340)">
          <rect x={0} y={0} width={45} height={38} rx={3} fill="#ffffff" stroke="#cbd5e1" strokeWidth={1} />
          <text x={22} y={14} textAnchor="middle" fill="#0f172a" fontSize={7} fontFamily="sans-serif" fontWeight={800}>EXIT</text>
          <text x={22} y={24} textAnchor="middle" fill="#64748b" fontSize={4.5} fontFamily="sans-serif" fontWeight={700}>BETTER</text>
          <text x={22} y={30} textAnchor="middle" fill="#64748b" fontSize={4.5} fontFamily="sans-serif" fontWeight={700}>SYSTEMS</text>
          <text x={22} y={36} textAnchor="middle" fill="#ef4444" fontSize={8} fontWeight={800}>→</text>
        </g>

        {/* 5. TOP CENTER: HYPERION ORCHESTRATOR DAIS & ORB */}
        <circle
          cx={ORCHESTRATOR_GEOMETRY.center.x}
          cy={ORCHESTRATOR_GEOMETRY.center.y}
          r={70}
          fill="url(#hologramOrbGlow)"
        />
        <OrchestratorDais
          x={ORCHESTRATOR_GEOMETRY.dais.x}
          y={ORCHESTRATOR_GEOMETRY.dais.y}
          w={ORCHESTRATOR_GEOMETRY.dais.w}
          h={ORCHESTRATOR_GEOMETRY.dais.h}
          titleLabel={coreLabel || 'HYPERION ORCHESTRATOR'}
        />
        <WorkerFigure
          x={orchestrator.pos.x}
          y={orchestrator.pos.y}
          characterKey="orchestrator"
          status={orchestrator.status}
          isOrchestrator
        />

        {/* 6. ROOM DECOR & FURNITURE PER STATION */}
        {/* Documents Room: Bookshelf & Filing Cabinet */}
        <Bookshelf x={34} y={200} />
        <rect x={34} y={268} width={28} height={20} rx={1} fill="#94a3b8" stroke="#64748b" strokeWidth={1} />
        <line x1={34} y1={278} x2={62} y2={278} stroke="#64748b" strokeWidth={0.8} />

        {/* Knowledge Base Room: Tall Double Bookshelf */}
        <Bookshelf x={335} y={190} />
        <Bookshelf x={590} y={190} />

        {/* Analysis Room: Whiteboard Diagram */}
        <AnalysisWhiteboard x={635} y={210} />

        {/* Tools / Code Room: Server Rack & Tool Pegboard */}
        <ServerRack x={34} y={400} />
        <g transform="translate(34, 450)">
          <rect x={0} y={0} width={28} height={35} rx={1} fill="#1e293b" stroke="#475569" strokeWidth={1} />
          <line x1={6} y1={8} x2={22} y2={24} stroke="#ef4444" strokeWidth={2} />
          <line x1={6} y1={24} x2={22} y2={8} stroke="#38bdf8" strokeWidth={2} />
        </g>
        {/* Verification & Testing Equipment */}
        <Bookshelf x={335} y={395} />
        <TestingEquipment x={345} y={450} />

        {/* Report / Delivery Room: Bookshelf */}
        <Bookshelf x={590} y={395} />

        {/* Potted Plants around the office */}
        {PLANT_LOCATIONS.map((plant, idx) => (
          <PottedPlant key={`plant-${idx}-${plant.x}-${plant.y}`} x={plant.x} y={plant.y} />
        ))}

        {/* 7. 6 SPECIALIST WORKSTATIONS */}
        {Object.values(OFFICE_STATIONS).map((station) => {
          const occupancy = occupiedStations.get(station.id)
          return (
            <Workstation
              key={station.id}
              x={station.desk.x}
              y={station.desk.y}
              label={station.label}
              role={station.role}
              stationId={station.id}
              isOccupied={(occupancy?.count ?? 0) > 0}
              isWorking={occupancy?.isWorking ?? false}
              statusDotColor={occupancy?.statusDotColor ?? '#10b981'}
            />
          )
        })}

        {/* 8. PERSONAL AGENT CABINS */}
        {cabinsToRender.map((cabin) => {
          const cabinNum = cabin.seatIndex ?? 1
          const geom = getCabinGeometry(cabinNum)
          const isOccupied = workers.some((w) => {
            const ow = officeState.workers.find(item => item.id === w.id)
            return ow?.currentLocation?.kind === 'cabin' &&
              (ow.currentLocation.zone === cabin.id || ow.cabinId === cabin.id)
          })
          return (
            <PersonalCabin
              key={cabin.id}
              x={geom.zone.x}
              y={geom.zone.y}
              w={geom.zone.w}
              h={geom.zone.h}
              cabinNumber={cabinNum}
              label={cabin.label}
              status={cabin.status}
              isOccupied={isOccupied}
            />
          )
        })}

        {/* 9. OFFICE ENTRANCE CORRIDOR & DOUBLE GLASS DOORS */}
        <g transform="translate(440, 545)">
          {/* Welcome Entrance Mat */}
          <rect x={0} y={0} width={80} height={20} rx={3} fill="#1e293b" stroke="#334155" strokeWidth={1} />
          <text x={40} y={13} textAnchor="middle" fill="#94a3b8" fontSize={6.5} fontFamily="sans-serif" fontWeight={800} letterSpacing={1}>
            ENTRANCE
          </text>
          {/* Double sliding doors */}
          <line x1={0} y1={25} x2={36} y2={25} stroke="#38bdf8" strokeWidth={3} />
          <line x1={44} y1={25} x2={80} y2={25} stroke="#38bdf8" strokeWidth={3} />
        </g>

        {/* Verification Chamber Highlight if pending */}
        {hasPendingVerification && (
          <rect
            x={OFFICE_STATIONS.verification.zone.x}
            y={OFFICE_STATIONS.verification.zone.y}
            width={OFFICE_STATIONS.verification.zone.w}
            height={OFFICE_STATIONS.verification.zone.h}
            rx={8}
            fill="#ef4444"
            stroke="#ef4444"
            strokeWidth={2.5}
            className={css.verificationHighlight}
          />
        )}

        {/* 10. ACTIVE & SEATED WORKER CHARACTERS */}
        {workers.map(w => (
          <WorkerFigure
            key={w.id}
            x={w.pos.x}
            y={w.pos.y}
            characterKey={w.characterKey}
            status={w.status}
            glyph={w.visualBehavior.glyph}
            frame={w.frame}
            scale={2.2}
          />
        ))}

        {/* 9. SPEECH & ACTIVITY BUBBLES */}
        {activeBubbles.map(b => (
          <BehaviorBubble
            key={`bubble-${b.id}`}
            x={b.x}
            y={b.y}
            text={b.text}
            status={b.status}
            stationId={b.id === 'orchestrator' ? undefined : (workers.find(w => w.id === b.id)?.characterKey)}
          />
        ))}
      </svg>
    </div>
  )
}
