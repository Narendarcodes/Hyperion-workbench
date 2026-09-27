import React from 'react'
import { openModelHub } from '@deepseek-ai/dsh-client-ui-model-hub'
import { pidStore } from '../pidStore'
import { useWorkbenchStore, workbenchStore } from '../workbenchStore'
import css from './PIDSidebarNav.module.css'

export const PIDSidebarNav: React.FC = () => {
  const { activeRoute } = useWorkbenchStore()

  const navigateTo = (route: string) => {
    workbenchStore.setActiveRoute(route)
    if (route === '/pid') {
      pidStore.setActiveNav('pid')
    } else if (route === '/plant') {
      pidStore.setActiveNav('plant')
    } else if (route === '/model-hub') {
      openModelHub()
    }
  }

  const getItemClass = (route: string) => {
    return activeRoute === route ? `${css.navItem} ${css.active}` : css.navItem
  }

  return (
    <aside className={css.sidebar}>
      {/* Top Brand Header */}
      <div className={css.brandHeader}>
        <div className={css.brandLogo}>H</div>
        <div className={css.brandText}>
          <span className={css.brandName}>HYPERION</span>
          <span className={css.brandSub}>Industrial Engineering Workbench</span>
        </div>
      </div>

      {/* New Work Button */}
      <div className={css.actionArea}>
        <button
          type="button"
          className={css.newWorkBtn}
          onClick={() => workbenchStore.openNewWork()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New work</span>
        </button>
      </div>

      {/* Navigation Tree */}
      <div className={css.navScroll}>
        {/* GENERAL */}
        <div className={css.section}>
          <div className={css.sectionTitle}>GENERAL</div>
          <div className={getItemClass('/home')} onClick={() => navigateTo('/home')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            <span>Home</span>
          </div>
        </div>

        {/* PLANT */}
        <div className={css.section}>
          <div className={css.sectionTitle}>PLANT</div>
          <div className={getItemClass('/plant')} onClick={() => navigateTo('/plant')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 20h20M5 20V8l7-4 7 4v12" />
            </svg>
            <span>Plant</span>
          </div>
          <div className={getItemClass('/pid')} onClick={() => navigateTo('/pid')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>P&ID</span>
          </div>
          <div className={getItemClass('/equipment')} onClick={() => navigateTo('/equipment')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
            </svg>
            <span>Equipment</span>
          </div>
        </div>

        {/* WORK */}
        <div className={css.section}>
          <div className={css.sectionTitle}>WORK</div>
          <div className={getItemClass('/investigations')} onClick={() => navigateTo('/investigations')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            </svg>
            <span>Investigations</span>
          </div>
          <div className={getItemClass('/documents')} onClick={() => navigateTo('/documents')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            </svg>
            <span>Documents</span>
          </div>
          <div className={getItemClass('/reports')} onClick={() => navigateTo('/reports')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Reports</span>
          </div>
        </div>

        {/* SIMULATION */}
        <div className={css.section}>
          <div className={css.sectionTitle}>SIMULATION</div>
          <div className={getItemClass('/simulation')} onClick={() => navigateTo('/simulation')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span>Simulation</span>
          </div>
        </div>

        {/* HISTORY */}
        <div className={css.section}>
          <div className={css.sectionTitle}>HISTORY</div>
          <div className={getItemClass('/conversations')} onClick={() => navigateTo('/conversations')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Conversations</span>
          </div>
        </div>

        {/* MORE */}
        <div className={css.section}>
          <div className={css.sectionTitle}>MORE</div>
          <div className={getItemClass('/agent-runs')} onClick={() => navigateTo('/agent-runs')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>Agent Runs</span>
          </div>
          <div className={getItemClass('/model-hub')} onClick={() => navigateTo('/model-hub')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <span>Model Hub</span>
          </div>
          <div className={getItemClass('/model-router')} onClick={() => navigateTo('/model-router')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>Model Router</span>
          </div>
          <div className={getItemClass('/sovereignty')} onClick={() => navigateTo('/sovereignty')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Sovereignty</span>
          </div>
          <div className={getItemClass('/audit-logs')} onClick={() => navigateTo('/audit-logs')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Audit Logs</span>
          </div>
          <div className={getItemClass('/settings')} onClick={() => navigateTo('/settings')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </div>
        </div>
      </div>

      {/* Footer Area */}
      <div className={css.footer}>
        <div className={css.versionPill}>
          <span className={css.statusDot} />
          <span>Local &gt;</span>
        </div>
        <span>v0.1.3-alpha.2</span>
      </div>
    </aside>
  )
}
