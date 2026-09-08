/** Language row store: snapshot-mirror action and the revision guard. */
import { describe, expect, it } from 'vitest'
import { createLanguageRowStore } from '../src/client/settings-store.ts'

const OPTIONS = [{ id: 'en', label: 'English' }, { id: 'ja', label: '日本語' }]

describe('createLanguageRowStore', () => {
  it('init shape: empty mirror with revision at -1', () => {
    const store = createLanguageRowStore().create()
    expect(store.getSnapshot()).toEqual({ active: '', options: [], revision: -1 })
  })

  it('sync mirrors the snapshot and advances the revision', () => {
    const store = createLanguageRowStore().create()
    store.actions.sync('ja', OPTIONS, 0)
    expect(store.getSnapshot()).toEqual({ active: 'ja', options: OPTIONS, revision: 0 })
    store.actions.sync('en', OPTIONS, 1)
    expect(store.getSnapshot().active).toBe('en')
    expect(store.getSnapshot().revision).toBe(1)
  })

  it('revision guard drops stale and duplicate writes', () => {
    const store = createLanguageRowStore().create()
    store.actions.sync('en', OPTIONS, 5)
    store.actions.sync('ja', OPTIONS, 4)
    store.actions.sync('ja', OPTIONS, 5)
    expect(store.getSnapshot().active).toBe('en')
    expect(store.getSnapshot().revision).toBe(5)
  })
})
