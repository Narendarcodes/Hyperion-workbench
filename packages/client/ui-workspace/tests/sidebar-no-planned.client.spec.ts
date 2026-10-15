// Sidebar audit guard: the workbench nav renders no disabled "planned" items
// (Agent runs / Audit logs had no view behind them and were removed). Source-level
// check because the wide workbench nav needs the full shell to render.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const SRC = readFileSync(new URL('../src/client/rows/WorkspaceBrowser.tsx', import.meta.url), 'utf8')

describe('workbench sidebar', () => {
  it('has no planned (disabled, view-less) nav items', () => {
    expect(SRC).not.toMatch(/plannedItem\(/)
    expect(SRC).not.toMatch(/t\('nav\.(agentRuns|auditLogs)'\)/)
  })

  it('every remaining nav item routes to a real workbench view', () => {
    const views = [...SRC.matchAll(/setWorkbenchView\('([a-z-]+)'\)/g)].map(m => m[1])
    const known = readFileSync(new URL('../src/client/workbench-view.ts', import.meta.url), 'utf8')
    for (const v of views) expect(known).toContain(`'${String(v)}'`)
    expect(views.length).toBeGreaterThan(5)
  })
})
