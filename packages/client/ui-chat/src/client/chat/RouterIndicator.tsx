export interface RouterIndicatorProps {
  modelId?: string | undefined
  provider?: string | undefined
  taskType?: string | undefined
  complexity?: number | undefined
  className?: string | undefined
}

export function RouterIndicator({ modelId, provider, taskType, complexity, className }: RouterIndicatorProps) {
  if (!modelId) return null

  return (
    <div
      className={`router-indicator ${className || ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '6px',
        marginBottom: '2px',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px',
        lineHeight: '16px',
        backgroundColor: 'var(--dsw-alias-surface-overlay, rgba(128, 128, 128, 0.08))',
        border: '1px solid var(--dsw-alias-separator-subtle, rgba(128, 128, 128, 0.12))',
        color: 'var(--dsw-alias-label-secondary, #777)',
        userSelect: 'none',
      }}
      title={`Auto-routed by Laya to ${modelId}${provider ? ` (${provider})` : ''}`}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', color: '#6366f1' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      </span>
      <span>
        Auto &middot; Routed to <strong style={{ color: 'var(--dsw-alias-label-primary, #333)', fontWeight: 600 }}>{modelId}</strong>
      </span>
      {provider && (
        <span style={{ opacity: 0.6, fontSize: '10px' }}>({provider})</span>
      )}
      {taskType && (
        <span
          style={{
            marginLeft: '2px',
            padding: '1px 5px',
            borderRadius: '6px',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            color: '#6366f1',
            fontSize: '10px',
            fontWeight: 500,
          }}
        >
          {taskType}{complexity !== undefined ? ` · ${(complexity * 100).toFixed(0)}%` : ''}
        </span>
      )}
    </div>
  )
}
