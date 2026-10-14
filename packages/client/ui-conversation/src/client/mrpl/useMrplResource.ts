/**
 * One loading/ready/empty/error state machine for every MRPL screen.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/mrpl/useMrplResource
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { MrplApiError } from './api.ts'

export type MrplResourceState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: T }
  | { readonly status: 'empty'; readonly data: T }
  | { readonly status: 'error'; readonly error: MrplApiError }

/**
 * Load a resource and classify it.
 * @param load - fetcher; receives an AbortSignal cancelled on unmount / key change.
 * @param isEmpty - classifies a successful payload as empty.
 * @param key - reload when this changes (null = idle, stays loading).
 */
export function useMrplResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  isEmpty: (data: T) => boolean,
  key: string | null,
): MrplResourceState<T> & { readonly retry: () => void } {
  const [state, setState] = useState<MrplResourceState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const loadRef = useRef(load)
  const emptyRef = useRef(isEmpty)
  loadRef.current = load
  emptyRef.current = isEmpty

  useEffect(() => {
    if (key === null) return undefined
    const controller = new AbortController()
    setState({ status: 'loading' })
    loadRef.current(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return
        setState(emptyRef.current(data) ? { status: 'empty', data } : { status: 'ready', data })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          error: error instanceof MrplApiError ? error : new MrplApiError(0, 'unknown', String(error)),
        })
      },
    )
    return () => {
      controller.abort()
    }
  }, [key, attempt])

  const retry = useCallback(() => {
    setAttempt(value => value + 1)
  }, [])
  return { ...state, retry }
}
