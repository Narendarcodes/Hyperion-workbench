/** English copy for the four shipped presets and file copy for every other row. */

import { describe, expect, it } from 'vitest'
import { en, presetDisplayText } from '../src/client/locales.ts'

const translate = (bundle: typeof en) => (key: keyof typeof en): string => bundle[key]

describe('preset display copy', () => {
  it.each([
    ['standard', 'presetStandardName', 'presetStandardDescription'],
    ['ptc', 'presetPtcName', 'presetPtcDescription'],
    ['minimal', 'presetMinimalName', 'presetMinimalDescription'],
    ['cordis', 'presetCordisName', 'presetCordisDescription'],
  ] as const)('localizes the shipped %s preset in English', (id, nameKey, descriptionKey) => {
    const preset = { id, trust: 'system' as const, name: 'file name', description: 'file description' }

    expect(presetDisplayText(preset, translate(en)))
      .toEqual({ name: en[nameKey], description: en[descriptionKey] })
  })

  it('keeps file metadata for user and unknown system presets', () => {
    const fileCopy = { name: 'My standard', description: 'Our own preset.' }

    expect(presetDisplayText({ id: 'standard', trust: 'user', ...fileCopy }, translate(en)))
      .toEqual(fileCopy)
    expect(presetDisplayText({ id: 'deployment-extra', trust: 'system', ...fileCopy }, translate(en)))
      .toEqual(fileCopy)
    expect(presetDisplayText({ id: 'bare', trust: 'user' }, translate(en)))
      .toEqual({ name: 'bare' })
  })
})
