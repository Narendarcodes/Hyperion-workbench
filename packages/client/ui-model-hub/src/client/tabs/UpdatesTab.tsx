import { useState } from 'react'
import { checkOllamaUpdates, type OllamaReleaseUpdate } from '../services/telemetry.ts'
import { type ModelHubState } from '../store.ts'
import css from './UpdatesTab.module.css'

export interface UpdatesTabProps {
  storeState: ModelHubState
}

export function UpdatesTab({ storeState }: UpdatesTabProps) {
  const [checking, setChecking] = useState(false)
  const [updateResult, setUpdateResult] = useState<OllamaReleaseUpdate | null>(null)

  const handleCheckUpdates = async () => {
    setChecking(true)
    try {
      const res = await checkOllamaUpdates(storeState.ollamaVersion)
      setUpdateResult(res)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className={css.root}>
      <div className={css.versionCard}>
        <div className={css.headerRow}>
          <div>
            <h3 className={css.title}>Ollama Engine Updates</h3>
            <div className={css.subtitle}>
              Monitor local engine release versions and sovereign environment update status.
            </div>
          </div>
          <button
            type="button"
            className={css.checkBtn}
            disabled={checking}
            onClick={() => { void handleCheckUpdates() }}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
            </svg>
            {checking ? 'Checking Status...' : 'Check for Updates'}
          </button>
        </div>

        <div className={css.statsGrid}>
          <div className={css.statBox}>
            <div className={css.statLabel}>Current Version</div>
            <div className={css.statValue}>
              v{storeState.ollamaVersion.replace(/^v/, '')}
            </div>
          </div>

          <div className={css.statBox}>
            <div className={css.statLabel}>Latest Known Version</div>
            <div className={css.statValue}>
              {updateResult
                ? updateResult.isOnline
                  ? `v${updateResult.latestVersion?.replace(/^v/, '')}`
                  : 'Offline'
                : 'Not Checked'}
            </div>
          </div>

          <div className={css.statBox}>
            <div className={css.statLabel}>Update Status</div>
            <div>
              {updateResult ? (
                updateResult.isOnline ? (
                  updateResult.updateAvailable ? (
                    <span className={css.badgeWarning}>Update Available</span>
                  ) : (
                    <span className={css.badgeSuccess}>✓ Up to Date</span>
                  )
                ) : (
                  <span className={css.badgeOffline}>Offline / Air-Gapped Mode</span>
                )
              ) : (
                <span className={css.badgeOffline}>Ready to Check</span>
              )}
            </div>
          </div>
        </div>

        {/* Offline Air-Gapped Explanation */}
        {updateResult && !updateResult.isOnline && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              fontSize: 13,
              color: '#fde68a',
              lineHeight: 1.5,
            }}
          >
            <strong>Sovereign / Air-Gapped Environment:</strong> External update repository is not reachable.
            Your local Ollama installation (<code>v{storeState.ollamaVersion}</code>) operates completely on-premise without cloud telemetry or external network calls.
          </div>
        )}

        {/* Release Notes / Changelog (if connected) */}
        {updateResult && updateResult.isOnline && updateResult.releaseNotes && (
          <div>
            <div className={css.modelsSectionTitle}>
              Release Notes (v{updateResult.latestVersion?.replace(/^v/, '')})
            </div>
            <div className={css.changelogBox}>
              {updateResult.releaseNotes}
            </div>
          </div>
        )}
      </div>

      {/* Local Installed Models State */}
      <div className={css.versionCard}>
        <h3 className={css.title} style={{ fontSize: 14 }}>Installed Model Inventory</h3>
        <div className={css.subtitle}>
          {storeState.models.length} local model weights registered and ready for offline execution.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {storeState.models.map(m => (
            <div
              key={m.name}
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 13, marginBottom: 4 }}>
                {m.name}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                <span>Format: {m.details?.format || 'gguf'}</span>
                <span>Digest: {m.digest.slice(0, 10)}...</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
