import React from 'react'
import { usePIDStore } from './pidStore'
import { useWorkbenchStore } from './workbenchStore'

import { PIDSidebarNav } from './components/PIDSidebarNav'
import { PIDHeader } from './components/PIDHeader'
import { PIDSearchBar } from './components/PIDSearchBar'
import { PIDNavigator } from './components/PIDNavigator'
import { PIDViewer } from './components/PIDViewer'
import { EquipmentContextPanel } from './components/EquipmentContextPanel'
import { BottomCards } from './components/BottomCards'
import { PIDAIChatModal } from './components/PIDAIChatModal'
import { PlantOverview } from './components/PlantOverview'
import { EquipmentWorkspace } from './components/EquipmentWorkspace'
import { InvestigationsWorkspace } from './components/InvestigationsWorkspace'
import { DocumentsWorkspace } from './components/DocumentsWorkspace'
import { ReportsWorkspace } from './components/ReportsWorkspace'
import { SimulationWorkspace } from './components/SimulationWorkspace'
import { ConversationsWorkspace } from './components/ConversationsWorkspace'
import { AgentRunsWorkspace } from './components/AgentRunsWorkspace'
import { ModelHubWorkspace } from './components/ModelHubWorkspace'
import { ModelRouterWorkspace } from './components/ModelRouterWorkspace'
import { SovereigntyWorkspace } from './components/SovereigntyWorkspace'
import { AuditLogsWorkspace } from './components/AuditLogsWorkspace'
import { SettingsWorkspace } from './components/SettingsWorkspace'
import { ToastContainer } from './components/ToastContainer'
import { NewWorkModal } from './components/NewWorkModal'
import { FilterModal } from './components/FilterModal'

import css from './PIDWorkspace.module.css'

export const PIDWorkspace: React.FC = () => {
  const { isOpen } = usePIDStore()
  const { activeRoute } = useWorkbenchStore()

  if (!isOpen) return null

  const renderActiveWorkspace = () => {
    switch (activeRoute) {
      case '/home':
      case '/plant':
        return <PlantOverview />

      case '/pid':
        return (
          <div className={css.mainContainer}>
            {/* Top Header */}
            <PIDHeader />

            {/* Search, Filter & AI Action Bar */}
            <PIDSearchBar />

            {/* Three Column Main Workspace */}
            <div className={css.middleSection}>
              {/* Left Column: P&ID Navigator (~225px) */}
              <PIDNavigator />

              {/* Center Column: P&ID Viewer (flexible canvas) */}
              <div className={css.centerWorkspace}>
                <PIDViewer />
              </div>

              {/* Right Column: Equipment Context Panel (~335px) */}
              <EquipmentContextPanel />
            </div>

            {/* Bottom Information Cards */}
            <BottomCards />
          </div>
        )

      case '/equipment':
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <EquipmentWorkspace />
          </div>
        )

      case '/investigations':
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <InvestigationsWorkspace />
          </div>
        )

      case '/documents':
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <DocumentsWorkspace />
          </div>
        )

      case '/reports':
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <ReportsWorkspace />
          </div>
        )

      case '/simulation':
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <SimulationWorkspace />
          </div>
        )

      case '/conversations':
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <ConversationsWorkspace />
          </div>
        )

      case '/agent-runs':
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <AgentRunsWorkspace />
          </div>
        )

      case '/model-hub':
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <ModelHubWorkspace />
          </div>
        )

      case '/model-router':
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <ModelRouterWorkspace />
          </div>
        )

      case '/sovereignty':
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <SovereigntyWorkspace />
          </div>
        )

      case '/audit-logs':
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <AuditLogsWorkspace />
          </div>
        )

      case '/settings':
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <SettingsWorkspace />
          </div>
        )

      default:
        return (
          <div className={css.mainContainer}>
            <PIDHeader />
            <PlantOverview />
          </div>
        )
    }
  }

  return (
    <div className={css.appLayout}>
      {/* Left Sidebar Navigation */}
      <PIDSidebarNav />

      {/* Main Active Workspace Screen */}
      {renderActiveWorkspace()}

      {/* Global Modals, Toast Drawer & AI Drawer */}
      <PIDAIChatModal />
      <ToastContainer />
      <NewWorkModal />
      <FilterModal />
    </div>
  )
}

