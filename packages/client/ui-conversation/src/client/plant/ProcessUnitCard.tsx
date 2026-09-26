/**
 * ProcessUnitCard: Card displaying one refinery process unit with equipment and document counts.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/ProcessUnitCard
 */

import type { ProcessUnit } from './types.ts'
import css from './ProcessUnits.module.css'

export interface ProcessUnitCardProps {
  readonly unit: ProcessUnit
  readonly onClick?: () => void
}

function UnitIcon({ code }: { code: string }) {
  switch (code) {
    case 'CDU':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="7" y="4" width="10" height="16" rx="2" />
          <line x1="7" y1="8" x2="17" y2="8" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="7" y1="16" x2="17" y2="16" />
          <path d="M12 2v2" />
          <path d="M17 10h4" />
        </svg>
      )
    case 'VDU':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 22h8M10 22V6a2 2 0 0 1 4 0v16M6 18h12M7 14h10" />
        </svg>
      )
    case 'HCU':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="6" width="12" height="14" rx="3" />
          <path d="M12 2v4M9 10h6M9 14h6" />
        </svg>
      )
    case 'HDT':
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 2v7.31M14 2v7.31M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" />
        </svg>
      )
  }
}

export function ProcessUnitCard({ unit, onClick }: ProcessUnitCardProps) {
  return (
    <button
      type="button"
      className={css.unitCard}
      onClick={onClick}
      aria-label={`${unit.code}: ${unit.description}, ${unit.equipmentCount} equipment, ${unit.documentCount} documents`}
    >
      <div className={css.cardTop}>
        <div className={css.topInfo}>
          <div className={css.unitIconBox} data-tone={unit.tone} aria-hidden="true">
            <UnitIcon code={unit.code} />
          </div>
          <span className={css.unitCode}>{unit.code}</span>
        </div>
        <span className={css.statusDot} aria-hidden="true" title="Active" />
      </div>

      <div className={css.cardMiddle}>
        <span className={css.unitDesc}>{unit.description}</span>
      </div>

      <div className={css.cardBottom}>
        <div className={css.statRow}>
          <svg className={css.statIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="2" y="6" width="20" height="12" rx="3" />
            <line x1="6" y1="6" x2="6" y2="18" />
            <line x1="10" y1="6" x2="10" y2="18" />
            <line x1="14" y1="6" x2="14" y2="18" />
            <line x1="18" y1="6" x2="18" y2="18" />
          </svg>
          <span>{unit.equipmentCount} equipment</span>
        </div>
        <div className={css.statRow}>
          <svg className={css.statIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          </svg>
          <span>{unit.documentCount} documents</span>
        </div>
      </div>
    </button>
  )
}
