/**
 * WorkbenchUtilityRow: the single shared top-right control strip for every
 * Hyperion workbench surface (theme toggle, local-state pill). Notifications and
 * profile were removed: no notification source or account system backs them.
 * Rendered once by ConversationRoot above workbench pages — page headers must
 * not reimplement it. Copy rides the locale seat; icons are the shared
 * 16px stroke set at 28px circular buttons, matching the sidebar shell.
 */
import { IconLightOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { toggleWorkbenchTheme } from './theme-toggle.ts'
import type { ConversationSlotProps } from '../contract/slots.ts'
import css from './WorkbenchUtilityRow.module.css'

export interface WorkbenchUtilityRowProps {
  readonly state?: 'available' | 'unavailable' | undefined
  readonly t: ConversationSlotProps['t']
}

export function WorkbenchUtilityRow({ state = 'available', t }: WorkbenchUtilityRowProps) {
  return (
    <div className={css.row}>
      <div className={css.affordances} role="group" aria-label={t('home.controls.aria')}>
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('home.controls.theme')}
          title={t('home.controls.theme')}
          onClick={() => { toggleWorkbenchTheme() }}
        >
          <IconLightOutline16 size={16} />
        </button>
      </div>
      <span className={css.statePill}>
        <span
          aria-hidden="true"
          className={`${css.stateDot} ${state === 'unavailable' ? css.stateDotUnavailable : ''}`}
        />
        {t(state === 'available' ? 'home.state.available' : 'home.state.unavailable')}
      </span>
    </div>
  )
}
