export interface RouterIndicatorProps {
  modelId?: string
  route?: string
  className?: string
}

export function RouterIndicator({ modelId, route, className }: RouterIndicatorProps) {
  if (!modelId) return null

  return (
    <div className={`router-indicator ${className || ''}`} style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #888)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
      <span>Powered by <strong>{modelId}</strong></span>
      {route && <span style={{ opacity: 0.8 }} title="Dynamic Model Selection Route">(via Auto: {route})</span>}
    </div>
  )
}
