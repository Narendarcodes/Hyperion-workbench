import React, { useEffect } from 'react'
import {
  useStoreSnapshot,
  closeModelHub,
  setActiveTab,
  setAddModelOpen,
  setAddLlamaModelOpen,
  setModelDetailsOpen,
  setLlamaDetailsOpen,
} from './store'
import { ModelsTab } from './tabs/ModelsTab'
import { LlamaModelsTab } from './tabs/LlamaModelsTab'
import { CustomModelsTab } from './tabs/CustomModelsTab'
import { UpdatesTab } from './tabs/UpdatesTab'
import { ResourcesTab } from './tabs/ResourcesTab'
import { QuickActionsPanel } from './panels/QuickActionsPanel'
import { AddModelModal } from './dialogs/AddModelModal'
import { AddLlamaModelModal } from './dialogs/AddLlamaModelModal'
import { ModelDetailsModal } from './dialogs/ModelDetailsModal'
import { LlamaModelDetailsModal } from './dialogs/LlamaModelDetailsModal'
import css from './ModelHubWorkspace.module.css'

interface TabErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class TabErrorBoundary extends React.Component<{ children: React.ReactNode }, TabErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ModelHub TabErrorBoundary caught an error:', error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center', background: '#fff1f2', borderRadius: 8, border: '1px solid #fecdd3' }}>
          <h3 style={{ color: '#991b1b', margin: '0 0 8px 0' }}>Something went wrong displaying this tab</h3>
          <p style={{ color: '#7f1d1d', fontSize: 13, marginBottom: 16 }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '6px 16px',
              background: '#991b1b',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Retry Tab
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export const ModelHubWorkspace: React.FC = () => {
  const store = useStoreSnapshot()
  const {
    activeTab,
    models,
    llamaModels,
    runningModels,
    isAddModelOpen,
    isAddLlamaModelOpen,
    isModelDetailsOpen,
    isLlamaDetailsOpen,
    selectedModel,
    selectedLlamaModel,
  } = store

  const isOpen = Boolean(store.isOpen || store.isModelHubOpen)

  // Listen for Escape key to close
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !isAddModelOpen &&
        !isAddLlamaModelOpen &&
        !isModelDetailsOpen &&
        !isLlamaDetailsOpen
      ) {
        closeModelHub()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isAddModelOpen, isAddLlamaModelOpen, isModelDetailsOpen, isLlamaDetailsOpen])

  if (!isOpen) return null

  return (
    <div className={css.workspaceOverlay} onClick={e => e.stopPropagation()}>
      {/* Top Navigation Bar */}
      <header className={css.topBar}>
        <div className={css.brandGroup}>
          <div className={css.brandIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div className={css.brandTitles}>
            <span className={css.brandTitle}>Model Hub</span>
            <span className={css.brandTagline}>HYPERION Local Engine & System Compute</span>
          </div>
        </div>

        {/* Central Tab Controls */}
        <nav className={css.tabNavigation}>
          <button
            type="button"
            className={`${css.tabBtn} ${activeTab === 'models' ? css.active : ''}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setActiveTab('models')
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            Models
            <span className={css.tabBadge}>{models.length}</span>
          </button>

          <button
            type="button"
            className={`${css.tabBtn} ${activeTab === 'llama-models' ? css.active : ''}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setActiveTab('llama-models')
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            Llama Models
            <span className={css.tabBadge}>{llamaModels.length}</span>
          </button>

          <button
            type="button"
            className={`${css.tabBtn} ${activeTab === 'custom' ? css.active : ''}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setActiveTab('custom')
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Custom Models
          </button>

          <button
            type="button"
            className={`${css.tabBtn} ${activeTab === 'updates' ? css.active : ''}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setActiveTab('updates')
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Updates
          </button>

          <button
            type="button"
            className={`${css.tabBtn} ${activeTab === 'resources' ? css.active : ''}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setActiveTab('resources')
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" />
              <line x1="8" y1="2" x2="8" y2="22" />
              <line x1="16" y1="2" x2="16" y2="22" />
              <line x1="2" y1="8" x2="22" y2="8" />
              <line x1="2" y1="16" x2="22" y2="16" />
            </svg>
            Resources
            {runningModels.length > 0 && (
              <span className={css.tabBadge} style={{ background: '#22c55e' }}>
                {runningModels.length} active
              </span>
            )}
          </button>
        </nav>

        {/* Top Right Exit Action */}
        <div className={css.topBarActions}>
          <button
            type="button"
            className={css.closeHubBtn}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              closeModelHub()
            }}
            title="Return to HYPERION Workspace (Esc)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Close Hub
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={css.workspaceContent}>
        <div className={css.mainPanel}>
          <TabErrorBoundary key={activeTab}>
            {activeTab === 'models' && <ModelsTab storeState={store} />}
            {activeTab === 'llama-models' && <LlamaModelsTab storeState={store} />}
            {activeTab === 'custom' && <CustomModelsTab storeState={store} />}
            {activeTab === 'updates' && <UpdatesTab storeState={store} />}
            {activeTab === 'resources' && <ResourcesTab />}
          </TabErrorBoundary>
        </div>

        {/* Right Sidebar Quick Actions & Telemetry Strip */}
        <QuickActionsPanel
          onOpenAddModal={() => setAddModelOpen(true)}
          onSelectTab={tab => setActiveTab(tab)}
        />
      </main>

      {/* Dialogs */}
      <AddModelModal isOpen={isAddModelOpen} onClose={() => setAddModelOpen(false)} />

      <AddLlamaModelModal isOpen={isAddLlamaModelOpen} onClose={() => setAddLlamaModelOpen(false)} />

      <ModelDetailsModal
        modelName={selectedModel?.name ?? null}
        onClose={() => setModelDetailsOpen(false)}
      />

      <LlamaModelDetailsModal
        modelName={selectedLlamaModel?.name ?? null}
        onClose={() => setLlamaDetailsOpen(false)}
      />
    </div>
  )
}
