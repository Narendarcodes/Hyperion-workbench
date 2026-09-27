import { useSyncExternalStore } from 'react'

export interface Toast {
  id: string
  type: 'success' | 'info' | 'warning' | 'error'
  message: string
  duration?: number
}

class ToastStore {
  private toasts: Toast[] = []
  private listeners = new Set<() => void>()

  getSnapshot = (): Toast[] => this.toasts

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  show(type: Toast['type'], message: string, duration = 3500): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    const toast: Toast = { id, type, message, duration }
    this.toasts = [...this.toasts, toast]
    this.notify()

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id)
      }, duration)
    }

    return id
  }

  success(message: string, duration?: number): string {
    return this.show('success', message, duration)
  }

  info(message: string, duration?: number): string {
    return this.show('info', message, duration)
  }

  warning(message: string, duration?: number): string {
    return this.show('warning', message, duration)
  }

  error(message: string, duration?: number): string {
    return this.show('error', message, duration)
  }

  dismiss(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id)
    this.notify()
  }

  clear(): void {
    this.toasts = []
    this.notify()
  }
}

export const toastStore = new ToastStore()

export function useToasts(): Toast[] {
  return useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot)
}
