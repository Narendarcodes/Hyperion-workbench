/**
 * InvestigationWorkflowStepper: Four-stage engineering workflow stepper
 * (1 Investigate -> 2 Analyze -> 3 Recommend -> 4 Report) matching reference screenshot.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/investigations/InvestigationWorkflowStepper
 */

import type { WorkflowStage } from './types.ts'
import css from './InvestigationWorkflowStepper.module.css'

export interface InvestigationWorkflowStepperProps {
  readonly stages: readonly WorkflowStage[]
  readonly currentStageKey?: WorkflowStage['key']
  readonly onSelectStage?: (stageKey: WorkflowStage['key']) => void
}

export function InvestigationWorkflowStepper({
  stages,
  currentStageKey = 'investigate',
  onSelectStage,
}: InvestigationWorkflowStepperProps) {
  return (
    <div className={css.stepperCard} role="region" aria-label="Investigation workflow progress">
      <ol className={css.stepsList}>
        {stages.map((stage, idx) => {
          const isActive = stage.key === currentStageKey || stage.status === 'active'
          const isCompleted = stage.status === 'completed'
          const hasNext = idx < stages.length - 1

          return (
            <li key={stage.key} className={css.stepItem}>
              <button
                type="button"
                className={`${css.stepBtn} ${isActive ? css.stepBtnActive : ''} ${isCompleted ? css.stepBtnCompleted : ''}`}
                onClick={() => onSelectStage?.(stage.key)}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Stage ${stage.step}: ${stage.label}`}
              >
                <span className={`${css.stepCircle} ${isActive ? css.circleActive : isCompleted ? css.circleCompleted : css.circleUpcoming}`}>
                  {stage.step}
                </span>
                <span className={`${css.stepLabel} ${isActive ? css.labelActive : css.labelUpcoming}`}>
                  {stage.label}
                </span>
              </button>

              {hasNext && (
                <div className={css.connectorSlot} aria-hidden="true">
                  <div className={css.connectorLine} />
                  <svg width="6" height="8" viewBox="0 0 6 8" fill="none" className={css.connectorArrow}>
                    <path d="M1 1L4.5 4L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
