// Mission View follows the app theme (light + body[data-ds-dark-theme]) instead of
// painting a hard-coded slate-900 page: no literal colours in its CSS modules or
// inline styles; every colour resolves through --mv-* tokens built on --dsw-alias-*.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'packages/client/ui-mission/src/client')
const CSS = ['MissionView.module.css', 'pixel-office/PixelOfficeCanvas.module.css', 'pixel-office/lifecycle/LifecycleReplayBar.module.css']
const LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(/g

describe('Mission View theme tokens', () => {
  it('has no literal colours outside the token block', () => {
    for (const file of CSS) {
      const text = readFileSync(join(SRC, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      const body = text.replace(/\.missionTokens\s*\{[\s\S]*?\}/, '')
      expect({ file, literals: body.match(LITERAL) ?? [] }).toEqual({ file, literals: [] })
    }
  })

  it('defines the tokens on the theme aliases (so dark/light both work)', () => {
    const text = readFileSync(join(SRC, 'MissionView.module.css'), 'utf8')
    const block = /\.missionTokens\s*\{([\s\S]*?)\}/.exec(text)?.[1] ?? ''
    expect(block).toContain('--dsw-alias-bg-base')
    expect(block).toContain('--dsw-alias-label-primary')
    expect(text).not.toMatch(/background-color:\s*#0f172a/)
  })

  it('MissionView.tsx has no inline literal colours', () => {
    const tsx = readFileSync(join(SRC, 'MissionView.tsx'), 'utf8')
    expect(tsx.match(/style=\{\{[^}]*#[0-9a-fA-F]{3,8}/g) ?? []).toEqual([])
  })
})
