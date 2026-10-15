// Every class in the Reports CSS module is referenced by the components that
// import it (dead selectors from the pre-wiring mock layout are removed).
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = fileURLToPath(new URL('../src/client/reports/', import.meta.url))
const CSS = 'ReportsOverview.module.css'

describe('Reports CSS module', () => {
  it('has no unused class selectors', () => {
    const css = readFileSync(join(DIR, CSS), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, '')
    const classes = [...new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1] ?? ''))]
      .filter(c => !/^\d/.test(c))
    const src = readdirSync(DIR)
      .filter(f => f.endsWith('.tsx'))
      .map(f => readFileSync(join(DIR, f), 'utf8'))
      .filter(s => s.includes(CSS))
      .join('\n')
    const unused = classes.filter(c => !new RegExp(`css\\.${c}\\b`).test(src))
    expect(unused).toEqual([])
  })
})
