/**
 * ModelHubWorkspace: Root overlay component for Model Hub in shell.overlay.
 * Renders the redesigned unified ModelHubView with escape handling and auto-dismiss.
 * @module @deepseek-ai/dsh-client-ui-model-hub/client/ModelHubWorkspace
 */

import React, { useEffect } from 'react'
import { useStoreSnapshot, closeModelHub } from './store.ts'
import { ModelHubView } from './ModelHubView.tsx'
import css from './ModelHubWorkspace.module.css'

export const ModelHubWorkspace: React.FC = () => {
  const store = useStoreSnapshot()
  const isOpen = Boolean(store.isOpen || store.isModelHubOpen)

  // Listen for Escape key to close
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !store.isAddModelOpen &&
        !store.isAddLlamaModelOpen &&
        !store.isConfigModalOpen
      ) {
        closeModelHub()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, store.isAddModelOpen, store.isAddLlamaModelOpen, store.isConfigModalOpen])

  // Auto-dismiss Model Hub when clicking inside the navigation sidebar (e.g. switching sessions or settings)
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const clickedSidebarWorkspace = target.closest('[data-slot="sidebar.workspaces"]')
      const clickedSidebarSettings = target.closest('[data-slot="sidebar.settings"]')
      const clickedSidebarBrand = target.closest('[data-slot="sidebar.brand.mark"]') || target.closest('[data-slot="sidebar.brand.name"]')
      if (clickedSidebarWorkspace || clickedSidebarSettings || clickedSidebarBrand) {
        closeModelHub()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className={css.workspaceOverlay} onClick={e => e.stopPropagation()}>
      <ModelHubView onClose={() => closeModelHub()} />
    </div>
  )
}
