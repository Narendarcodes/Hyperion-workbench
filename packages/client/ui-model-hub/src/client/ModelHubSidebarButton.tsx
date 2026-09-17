import clsx from 'clsx'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { toggleModelHub, useStoreSnapshot } from './store.ts'
import css from './ModelHubSidebarButton.module.css'

export interface ModelHubSidebarButtonProps {
  wide?: boolean
}

export function ModelHubSidebarButton({ wide = true }: ModelHubSidebarButtonProps) {
  const storeState = useStoreSnapshot()

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleModelHub()
  }

  // Model Hub Icon (AI model cube / neural processor icon)
  const icon = (
    <svg viewBox="0 0 16 16" width={wide ? 16 : 18} height={wide ? 16 : 18} fill="currentColor" aria-hidden>
      <path d="M7.657 1.134a.75.75 0 0 1 .686 0l5.5 3a.75.75 0 0 1 .397.66v6.412a.75.75 0 0 1-.397.66l-5.5 3a.75.75 0 0 1-.686 0l-5.5-3a.75.75 0 0 1-.397-.66V4.794a.75.75 0 0 1 .397-.66l5.5-3zM8 2.373 3.5 4.827l4.5 2.455 4.5-2.455L8 2.373zm-4.75 3.74v5.093l4.25 2.318V8.43L3.25 6.113zm5.25 7.411 4.25-2.318V6.113L8.5 8.43v5.094z" />
    </svg>
  )

  const button = (
    <button
      type="button"
      className={clsx(
        css.trigger,
        !wide && css.rail,
        storeState.isOpen && css.active,
      )}
      aria-label="Model Hub"
      aria-expanded={storeState.isOpen}
      onClick={onClick}
    >
      <span className={css.icon}>{icon}</span>
      {wide && <span className={css.triggerLabel}>Model Hub</span>}
      {wide && storeState.ollamaConnected && (
        <span className={css.activeDot} title="Ollama connected" />
      )}
    </button>
  )

  return (
    <div
      className={clsx(css.triggerRow, !wide && css.railRow)}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {wide ? (
        button
      ) : (
        <Tooltip label="Model Hub" delayMs={400} side="right">
          {button}
        </Tooltip>
      )}
    </div>
  )
}
