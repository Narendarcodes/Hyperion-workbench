/** Vendored community set: every directory must discover as a named, described skill. */
import { describe, expect, it } from 'vitest'
import { readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as SkillFileSystem from '@deepseek-ai/dsh-skill-filesystem'

const HERE = dirname(fileURLToPath(import.meta.url))

describe('vendored community skills', () => {
  it('discovers every vendored dir with a name and description', async () => {
    const bundled = resolve(HERE, '../../../../skills/community')
    const dirs = readdirSync(bundled, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort()
    expect(dirs.length).toBeGreaterThan(50)
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(SkillFileSystem, {
      dshHome: join(bundled, '.none'),
      agentsHome: join(bundled, '.none-agents'),
      includeDefaultRoots: false,
      bundledSkillDir: bundled,
      watch: false,
    })
    const found = await ctx.skills.list({ cwd: bundled })
    if (!Array.isArray(found)) throw new Error('incomplete observation')
    const names = found.map(s => s.name).sort()
    expect(names).toEqual(dirs)
    for (const name of names) {
      const skill = await ctx.skills.get(name)
      expect(skill?.description?.trim().length).toBeGreaterThan(0)
      expect(skill?.source).toBe('bundled')
    }
    await ctx.fiber.dispose()
  })
})
