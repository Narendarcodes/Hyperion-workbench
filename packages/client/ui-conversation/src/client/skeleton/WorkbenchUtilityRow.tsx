/**
 * WorkbenchUtilityRow: the single shared top-right control strip for every
 * Hyperion workbench surface (theme, notifications, profile, local-state pill).
 * Rendered once by ConversationRoot above workbench pages — page headers must
 * not reimplement it. Copy rides the locale seat; icons are the shared
 * 16px stroke set at 28px circular buttons, matching the sidebar shell.
 */
import {
  IconBellOutline16,
  IconChevronDownOutline14,
  IconLightOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ConversationSlotProps } from '../contract/slots.ts'
import css from './WorkbenchUtilityRow.module.css'

export interface WorkbenchUtilityRowProps {
  readonly state?: 'available' | 'unavailable' | undefined
  readonly t: ConversationSlotProps['t']
}

export function WorkbenchUtilityRow({ state = 'available', t }: WorkbenchUtilityRowProps) {
  const toggleTheme = (): void => {
    const isDark = document.body.hasAttribute('data-ds-dark-theme')
    if (isDark) {
      document.body.removeAttribute('data-ds-dark-theme')
    } else {
      document.body.setAttribute('data-ds-dark-theme', 'true')
    }
  }

  return (
    <div className={css.row}>
      <div className={css.affordances} role="group" aria-label={t('home.controls.aria')}>
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('home.controls.theme')}
          title={t('home.controls.theme')}
          onClick={toggleTheme}
        >
          <IconLightOutline16 size={16} />
        </button>
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('home.controls.notifications')}
          title={t('home.controls.notifications')}
        >
          <IconBellOutline16 size={16} />
        </button>
        <button
          type="button"
          className={css.profileButton}
          aria-label={t('home.controls.profile')}
          title={t('home.controls.profile')}
        >
          <span className={css.avatar} aria-hidden="true">{t('home.profile.initial')}</span>
          <span className={css.chevron} aria-hidden="true">
            <IconChevronDownOutline14 size={14} />
          </span>
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
