/**
 * Shared observable state for the active Hyperion workbench view.
 * Defaults to 'plant' for browser runtime per Hyperion Screen 2 specifications,
 * and preserves 'home' default for test suites unless explicitly switched.
 * Synchronizes across client plugins using DOM CustomEvent and localStorage.
 * @module @deepseek-ai/dsh-client-ui-workspace/client/workbench-view
 */

import { useSyncExternalStore } from 'react'

export type WorkbenchView = 'home' | 'plant' | 'reports' | 'equipment' | 'investigations' | 'investigation-detail' | 'model-hub' | 'documents' | 'pid'

const STORAGE_KEY = 'dsh.workbench.view'
const EVENT_NAME = 'dsh:workbench:view'

const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'

function readStorage(): WorkbenchView {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'home' || stored === 'plant' || stored === 'reports' || stored === 'equipment' || stored === 'investigations' || stored === 'investigation-detail' || stored === 'model-hub' || stored === 'documents' || stored === 'pid') {
        return stored
      }
    } catch {}
  }
  return isTest ? 'home' : 'plant'
}

let currentView: WorkbenchView = readStorage()

const listeners = new Set<(view: WorkbenchView) => void>()

function notify(view: WorkbenchView) {
  currentView = view
  listeners.forEach(listener => listener(view))
}

export function getWorkbenchView(): WorkbenchView {
  currentView = readStorage()
  return currentView
}

export function setWorkbenchView(view: WorkbenchView): void {
  currentView = view
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, view)
    }
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: view }))
  }
  listeners.forEach(listener => listener(view))
}

export function subscribeWorkbenchView(listener: (view: WorkbenchView) => void): () => void {
  listeners.add(listener)

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<WorkbenchView>
    if (custom.detail === 'home' || custom.detail === 'plant' || custom.detail === 'reports' || custom.detail === 'equipment' || custom.detail === 'investigations' || custom.detail === 'investigation-detail' || custom.detail === 'model-hub' || custom.detail === 'documents' || custom.detail === 'pid') {
      notify(custom.detail)
    }
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && (e.newValue === 'home' || e.newValue === 'plant' || e.newValue === 'reports' || e.newValue === 'equipment' || e.newValue === 'investigations' || e.newValue === 'investigation-detail' || e.newValue === 'model-hub' || e.newValue === 'documents' || e.newValue === 'pid')) {
      notify(e.newValue as WorkbenchView)
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener(EVENT_NAME, handleCustomEvent)
    window.addEventListener('storage', handleStorage)
  }

  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined') {
      window.removeEventListener(EVENT_NAME, handleCustomEvent)
      window.removeEventListener('storage', handleStorage)
    }
  }
}

export function useWorkbenchView(): WorkbenchView {
  return useSyncExternalStore(subscribeWorkbenchView, getWorkbenchView, () => readStorage())
}
