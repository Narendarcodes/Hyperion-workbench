// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import * as ClientContract from '../src/client/mrpl/contract.ts'
import { MrplApiError, createHttpMrplSource, formatBytes } from '../src/client/mrpl/api.ts'
import { useMrplResource } from '../src/client/mrpl/useMrplResource.ts'
import { StatusChip, WorkbenchState } from '../src/client/mrpl/Workbench.tsx'

afterEach(cleanup)

const MARKER = '// MRPL workbench contract'

describe('MRPL wire contract mirror', () => {
  it('mirrors the host contract verbatim (no drift)', () => {
    const root = process.cwd()
    const host = readFileSync(join(root, 'packages/host/hyperion-bridge/src/shared.ts'), 'utf8')
    const client = readFileSync(join(root, 'packages/client/ui-conversation/src/client/mrpl/contract.ts'), 'utf8')
    const section = (text: string): string => text.slice(text.indexOf(MARKER))
    expect(section(client)).toBe(section(host))
  })

  it('exports identical route constants', async () => {
    // Runtime import by path: the client typecheck program never includes host files.
    const hostUrl = pathToFileURL(join(process.cwd(), 'packages/host/hyperion-bridge/src/shared.ts')).href
    const HostShared = await import(/* @vite-ignore */ hostUrl) as Record<string, unknown>
    const routes = Object.entries(ClientContract).filter(([key]) => key.startsWith('HYPERION_MRPL_'))
    expect(routes.length).toBe(7)
    for (const [key, value] of routes) expect(HostShared[key]).toBe(value)
  })
})

describe('createHttpMrplSource', () => {
  it('calls same-origin routes and maps errors', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, ...(init === undefined ? {} : { init }) })
      if (url.includes('DOC-404')) return new Response(JSON.stringify({ code: 'mrpl/document-not-found', message: 'nope' }), { status: 404 })
      if (url.includes('broken')) return new Response('<html>', { status: 502 })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })
    const source = createHttpMrplSource(fetchImpl)
    await source.listDocuments()
    await source.getDocumentText('DOC-010', 2)
    await source.verifyEvidence([{ id: 'a', documentId: 'DOC-010', page: 1, quotes: ['91'] }])
    await source.searchEvidence('benzene', { documentIds: ['DOC-010'], limit: 3 })
    expect(calls.map(call => call.url)).toEqual([
      '/hyperion/mrpl/documents',
      '/hyperion/mrpl/documents/DOC-010/text?page=2',
      '/hyperion/mrpl/evidence/verify',
      '/hyperion/mrpl/evidence/search?q=benzene&documentIds=DOC-010&limit=3',
    ])
    expect(calls[0]!.init?.credentials).toBe('same-origin')
    expect(calls[2]!.init?.method).toBe('POST')
    expect(JSON.parse(String(calls[2]!.init?.body))).toEqual({ citations: [{ id: 'a', documentId: 'DOC-010', page: 1, quotes: ['91'] }] })

    await expect(source.getDocument('DOC-404')).rejects.toMatchObject({ status: 404, code: 'mrpl/document-not-found', message: 'nope' })
    await expect(source.getDocument('broken')).rejects.toMatchObject({ status: 502, code: 'http-502' })
    const offline = createHttpMrplSource(async () => { throw new TypeError('fetch failed') })
    await expect(offline.listDeliverables()).rejects.toMatchObject({ status: 0, code: 'network' })
  })

  it('formats sizes', () => {
    expect(formatBytes(null)).toBe('—')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(3823)).toBe('3.7 KB')
    expect(formatBytes(1_230_545)).toBe('1.2 MB')
  })
})

describe('useMrplResource', () => {
  it('moves loading → ready/empty/error and retries', async () => {
    let mode: 'ok' | 'empty' | 'fail' = 'fail'
    const load = vi.fn(async () => {
      if (mode === 'fail') throw new MrplApiError(500, 'internal', 'boom')
      return mode === 'ok' ? [1] : []
    })
    const { result } = renderHook(() => useMrplResource(load, (data: number[]) => data.length === 0, 'k'))
    expect(result.current.status).toBe('loading')
    await waitFor(() => { expect(result.current.status).toBe('error') })
    mode = 'empty'
    result.current.retry()
    await waitFor(() => { expect(result.current.status).toBe('empty') })
    mode = 'ok'
    result.current.retry()
    await waitFor(() => { expect(result.current.status).toBe('ready') })
  })

  it('stays idle on a null key', () => {
    const load = vi.fn(async () => 1)
    const { result } = renderHook(() => useMrplResource(load, () => false, null))
    expect(result.current.status).toBe('loading')
    expect(load).not.toHaveBeenCalled()
  })
})

describe('WorkbenchState / StatusChip', () => {
  it('renders accessible loading, empty and error states', () => {
    const retry = vi.fn()
    render(
      <>
        <WorkbenchState kind="loading" label="Things" />
        <WorkbenchState kind="empty" label="Things" detail="Nothing here" />
        <WorkbenchState kind="error" label="Things" error={new MrplApiError(0, 'network', 'x')} onRetry={retry} />
        <StatusChip tone="ok">Verified</StatusChip>
      </>,
    )
    expect(screen.getByRole('status', { name: 'Loading Things' }).getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('No things yet')).toBeTruthy()
    expect(screen.getByRole('alert', { name: 'Things: error' }).textContent).toContain('unreachable')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Verified').closest('[data-tone]')?.getAttribute('data-tone')).toBe('ok')
  })
})
