/**
 * ModelHubView: Primary view component for HYPERION Model Hub.
 * Composes ModelHubHeader, ModelsTabView (Models tab), RuntimeTabView (Runtime tab),
 * and existing modal dialogs into a cohesive AI infrastructure workbench.
 * Sets data-hide-composer to hide the chat composer seat.
 * @module @deepseek-ai/dsh-client-ui-model-hub/client/ModelHubView
 */

import React, { useState } from 'react'
import { ModelHubHeader } from './ModelHubHeader.tsx'
import { ModelsTabView } from './ModelsTabView.tsx'
import { RuntimeTabView } from './RuntimeTabView.tsx'
import { AddModelModal } from './dialogs/AddModelModal.tsx'
import { AddLlamaModelModal } from './dialogs/AddLlamaModelModal.tsx'
import { RuntimeConfigDialog } from './dialogs/RuntimeConfigDialog.tsx'
import { useStoreSnapshot, modelHubStore } from './store.ts'
import css from './ModelHubView.module.css'

export interface ModelHubViewProps {
  readonly localState?: 'available' | 'unavailable' | undefined
  readonly initialTab?: 'models' | 'runtime'
  readonly onClose?: () => void
}

export const ModelHubView: React.FC<ModelHubViewProps> = ({
  localState = 'available',
  initialTab = 'models',
  _onClose,
}) => {
  const storeState = useStoreSnapshot()
  const [activeTab, setActiveTab] = useState<'models' | 'runtime'>(initialTab)

  return (
    <div
      className={css.pageRoot}
      data-hide-composer=""
      role="region"
      aria-label="Model Hub"
    >
      {/* 1. Header with Breadcrumb, Title, Subtitle, [ Models ] [ Runtime ] Tabs, and Refinery Backdrop */}
      <ModelHubHeader
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          modelHubStore.setActiveTab(tab)
        }}
        localState={localState}
      />

      {/* 2. Main Content: Models Tab or Runtime Tab */}
      <main className={css.mainContainer}>
        {activeTab === 'models' ? (
          <ModelsTabView
            storeState={storeState}
            onOpenAddModel={() => modelHubStore.setAddModelOpen(true)}
          />
        ) : (
          <RuntimeTabView
            storeState={storeState}
            onOpenConfigDialog={() => modelHubStore.setConfigModalOpen(true)}
          />
        )}
      </main>

      {/* 3. Existing functional dialogs */}
      <AddModelModal
        isOpen={storeState.isAddModelOpen}
        onClose={() => modelHubStore.setAddModelOpen(false)}
      />

      <AddLlamaModelModal
        isOpen={storeState.isAddLlamaModelOpen}
        onClose={() => modelHubStore.setAddLlamaModelOpen(false)}
      />

      <RuntimeConfigDialog
        isOpen={storeState.isConfigModalOpen}
        onClose={() => modelHubStore.setConfigModalOpen(false)}
      />
    </div>
  )
}
