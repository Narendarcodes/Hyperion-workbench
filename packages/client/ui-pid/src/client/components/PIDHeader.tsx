import React from 'react'
import { pidStore } from '../pidStore'
import { useWorkbenchStore, workbenchStore } from '../workbenchStore'
import { NotificationPopover } from './NotificationPopover'
import { UserMenuPopover } from './UserMenuPopover'
import { toastStore } from '../toastStore'
import css from './PIDHeader.module.css'

export const PIDHeader: React.FC = () => {
  const { isNotificationOpen, isUserMenuOpen, theme, notifications } = useWorkbenchStore()

  const unreadCount = notifications.filter(n => !n.read).length

  const handleToggleTheme = () => {
    workbenchStore.toggleTheme()
    toastStore.info(`Switched theme to ${theme === 'light' ? 'Dark' : 'Light'} mode`)
  }

  return (
    <header className={css.header}>
      <div className={css.titleArea}>
        <div className={css.breadcrumb}>
          <span style={{ cursor: 'pointer' }} onClick={() => pidStore.setActiveNav('plant')}>Plant</span>
          <span>/</span>
          <span style={{ cursor: 'pointer' }} onClick={() => pidStore.setActiveNav('pid')}>P&ID</span>
          <span>/</span>
          <span className={css.breadcrumbCurrent}>CDU-03</span>
        </div>
        <div className={css.headingRow}>
          <h1 className={css.title}>CDU-03 P&ID</h1>
          <span className={css.subtitle}>
            Crude Distillation Unit • Engineering diagram and equipment context
          </span>
        </div>
      </div>

      <div className={css.controls}>
        <div className={css.statusPill}>
          <span className={css.statusDot} />
          <span>Local state available</span>
        </div>

        {/* Theme Button */}
        <button
          type="button"
          className={css.iconBtn}
          title={`Switch Theme (Current: ${theme})`}
          onClick={handleToggleTheme}
        >
          {theme === 'light' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={css.iconBtn}
            title="Notifications"
            onClick={() => workbenchStore.toggleNotification()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && <span className={css.badgeDot} />}
          </button>
          {isNotificationOpen && <NotificationPopover />}
        </div>

        {/* User Avatar */}
        <div style={{ position: 'relative' }}>
          <div
            className={css.avatarGroup}
            title="Engineering User Profile"
            style={{ cursor: 'pointer' }}
            onClick={() => workbenchStore.toggleUserMenu()}
          >
            <div className={css.avatar}>N</div>
          </div>
          {isUserMenuOpen && <UserMenuPopover />}
        </div>
      </div>
    </header>
  )
}
