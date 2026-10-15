/**
 * SampleNote: the visible "this is sample data" label rendered next to any
 * bundled fixture (plant metrics, process units, investigation detail panels).
 * The text always comes from the surface's config so hosts can reword it.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/mrpl/SampleNote
 */

import type { CSSProperties } from 'react'

const STYLE: CSSProperties = {
  margin: '4px 0 8px',
  fontSize: 11,
  lineHeight: '16px',
  color: 'var(--dsw-alias-label-secondary, #666)',
  fontStyle: 'italic',
}

export function SampleNote({ label }: { readonly label: string }) {
  if (label === '') return null
  return <p role="note" data-sample-data="" style={STYLE}>{label}</p>
}
