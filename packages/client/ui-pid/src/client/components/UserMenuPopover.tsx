import React from 'react'
import { workbenchStore } from '../workbenchStore'
import { toastStore } from '../toastStore'
import css from './UserMenuPopover.module.css'

export const UserMenuPopover: React.FC = () => {
  const handleAction = (label: string, route?: string) => {
    workbenchStore.toggleUserMenu()
    if (route) {
      workbenchStore.setActiveRoute(route)
    } else if (label === 'Sign out') {
      toastStore.info('Signed out of Hyperion session.')
    } else if (label === 'Keyboard shortcuts') {
      toastStore.info('Shortcuts: Ctrl+K (Search), Ctrl+/ (AI Assistant), Esc (Close dialogs)')
    } else {
      toastStore.success(`Opened ${label}`)
    }
  }

  return (
    <div className={css.popover}>
      <div className={css.userInfo}>
        <div className={css.avatar}>N</div>
        <div>
          <div className={css.userName}>N. Engineer</div>
          <div className={css.userRole}>Lead Process Engineer</div>
        </div>
      </div>

      <div className={css.divider} />

      <div className={css.menuItem} onClick={() => handleAction('Profile', '/settings')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>Profile</span>
      </div>

      <div className={css.menuItem} onClick={() => handleAction('Preferences', '/settings')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>Preferences</span>
      </div>

      <div className={css.menuItem} onClick={() => handleAction('Keyboard shortcuts')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="6" y1="8" x2="6" y2="8" />
          <line x1="10" y1="8" x2="10" y2="8" />
          <line x1="14" y1="8" x2="14" y2="8" />
          <line x1="18" y1="8" x2="18" y2="8" />
          <line x1="8" y1="16" x2="16" y2="16" />
        </svg>
        <span>Keyboard shortcuts</span>
      </div>

      <div className={css.divider} />

      <div className={`${css.menuItem} ${css.danger}`} onClick={() => handleAction('Sign out')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>Sign out</span>
      </div>
    </div>
  )
}
