import React, { useState } from 'react'
import { pullModel, createCustomModel, formatBytes } from '../services/ollama'
import { refreshAll, selectModelForActiveSession } from '../store'
import css from './AddModelModal.module.css'

interface AddModelModalProps {
  isOpen: boolean
  onClose: () => void
}

const RECOMMENDED_MODELS = [
  { name: 'deepseek-r1:1.5b', label: 'DeepSeek R1 (1.5B reasoning)' },
  { name: 'llama3.2:1b', label: 'Llama 3.2 (1B lightweight)' },
  { name: 'qwen2.5-coder:1.5b', label: 'Qwen 2.5 Coder (1.5B coding)' },
  { name: 'gemma2:2b', label: 'Gemma 2 (2B general)' },
  { name: 'phi3:mini', label: 'Phi-3 Mini (3.8B)' },
]

export const AddModelModal: React.FC<AddModelModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'library' | 'airgap'>('library')

  // Library pull state
  const [pullModelName, setPullModelName] = useState('')
  const [isPulling, setIsPulling] = useState(false)
  const [pullStatus, setPullStatus] = useState<string | null>(null)
  const [pullProgress, setPullProgress] = useState<number | null>(null)
  const [pullBytes, setPullBytes] = useState<string | null>(null)
  const [pullError, setPullError] = useState<string | null>(null)

  // Airgap / GGUF import state
  const [ggufPath, setGgufPath] = useState('')
  const [ggufName, setGgufName] = useState('')
  const [ggufSystemPrompt, setGgufSystemPrompt] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  if (!isOpen) return null

  const handlePull = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pullModelName.trim()) return

    setIsPulling(true)
    setPullError(null)
    setPullStatus('Initiating pull request...')
    setPullProgress(null)
    setPullBytes(null)

    try {
      await pullModel(pullModelName.trim(), (progress) => {
        setPullStatus(progress.status)
        if (progress.total && progress.completed) {
          const pct = Math.round((progress.completed / progress.total) * 100)
          setPullProgress(pct)
          setPullBytes(`${formatBytes(progress.completed)} / ${formatBytes(progress.total)}`)
        } else {
          setPullProgress(null)
          setPullBytes(null)
        }
      })

      setPullStatus('Pull completed successfully!')
      await refreshAll()
      await selectModelForActiveSession(pullModelName.trim())
      setTimeout(() => {
        setIsPulling(false)
        onClose()
      }, 1200)
    } catch (err: any) {
      setIsPulling(false)
      setPullError(err.message || 'Failed to pull model from library')
    }
  }

  const handleImportGGUF = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ggufPath.trim() || !ggufName.trim()) {
      setImportError('Please enter both local GGUF path and model name.')
      return
    }

    setIsImporting(true)
    setImportError(null)
    setImportStatus('Compiling Modelfile and importing weights...')

    try {
      // Clean path for Modelfile
      const cleanPath = ggufPath.trim().replace(/\\/g, '/')
      let modelfile = `FROM "${cleanPath}"\n`
      if (ggufSystemPrompt.trim()) {
        modelfile += `SYSTEM """${ggufSystemPrompt.trim()}"""\n`
      }

      await createCustomModel({
        name: ggufName.trim(),
        modelfile,
      })

      setImportStatus('Local model imported successfully!')
      await refreshAll()
      await selectModelForActiveSession(ggufName.trim())
      setTimeout(() => {
        setIsImporting(false)
        onClose()
      }, 1200)
    } catch (err: any) {
      setIsImporting(false)
      setImportError(err.message || 'Failed to import local GGUF model')
    }
  }

  return (
    <div className={css.overlay} onClick={() => !isPulling && !isImporting && onClose()}>
      <div className={css.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={css.modalHeader}>
          <h3 className={css.modalTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Add Model to HYPERION
          </h3>
          <button
            type="button"
            className={css.closeBtn}
            onClick={onClose}
            disabled={isPulling || isImporting}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab Toggle */}
        <div className={css.modalTabs}>
          <button
            type="button"
            className={`${css.modalTabBtn} ${tab === 'library' ? css.activeTab : ''}`}
            onClick={() => setTab('library')}
            disabled={isPulling || isImporting}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Ollama Library (Online)
          </button>
          <button
            type="button"
            className={`${css.modalTabBtn} ${tab === 'airgap' ? css.activeTab : ''}`}
            onClick={() => setTab('airgap')}
            disabled={isPulling || isImporting}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Import Model Package (Air-Gapped GGUF)
          </button>
        </div>

        {/* Body */}
        {tab === 'library' ? (
          <form onSubmit={handlePull}>
            <div className={css.modalBody}>
              <div className={css.formGroup}>
                <label className={css.formLabel}>Model Identifier / Tag</label>
                <input
                  type="text"
                  className={css.input}
                  placeholder="e.g. deepseek-r1:1.5b, llama3.2, qwen2.5:3b"
                  value={pullModelName}
                  onChange={e => setPullModelName(e.target.value)}
                  disabled={isPulling}
                  autoFocus
                />
                <span className={css.formHint}>
                  Enter any public model from the official Ollama registry or Hugging Face repository.
                </span>
              </div>

              <div className={css.formGroup}>
                <label className={css.formLabel}>Recommended for RTX 2050 (4GB VRAM):</label>
                <div className={css.curatedPills}>
                  {RECOMMENDED_MODELS.map(m => (
                    <button
                      key={m.name}
                      type="button"
                      className={css.pill}
                      onClick={() => setPullModelName(m.name)}
                      disabled={isPulling}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real Streaming Progress */}
              {isPulling && (
                <div className={css.progressContainer}>
                  <div className={css.progressStatus}>
                    <span>{pullStatus || 'Pulling...'}</span>
                    {pullBytes && <span>{pullBytes}</span>}
                  </div>
                  {pullProgress !== null && (
                    <div className={css.progressBarTrack}>
                      <div
                        className={css.progressBarValue}
                        style={{ width: `${pullProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {pullError && <div className={css.errorBanner}>{pullError}</div>}
            </div>

            <div className={css.modalFooter}>
              <button
                type="button"
                className={css.cancelBtn}
                onClick={onClose}
                disabled={isPulling}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={css.submitBtn}
                disabled={isPulling || !pullModelName.trim()}
              >
                {isPulling ? 'Downloading Weights...' : 'Download & Register'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleImportGGUF}>
            <div className={css.modalBody}>
              <div className={css.formGroup}>
                <label className={css.formLabel}>Absolute Local GGUF Path</label>
                <input
                  type="text"
                  className={css.input}
                  placeholder="e.g. E:\models\DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf"
                  value={ggufPath}
                  onChange={e => setGgufPath(e.target.value)}
                  disabled={isImporting}
                  autoFocus
                />
                <span className={css.formHint}>
                  Air-gapped safe: registers model directly from local disk storage without network access.
                </span>
              </div>

              <div className={css.formGroup}>
                <label className={css.formLabel}>Registered Model Name</label>
                <input
                  type="text"
                  className={css.input}
                  placeholder="e.g. custom-deepseek:latest"
                  value={ggufName}
                  onChange={e => setGgufName(e.target.value)}
                  disabled={isImporting}
                />
              </div>

              <div className={css.formGroup}>
                <label className={css.formLabel}>Optional System Prompt</label>
                <textarea
                  className={css.input}
                  style={{ minHeight: '64px', resize: 'vertical' }}
                  placeholder="Optional default system persona or instructions..."
                  value={ggufSystemPrompt}
                  onChange={e => setGgufSystemPrompt(e.target.value)}
                  disabled={isImporting}
                />
              </div>

              {isImporting && (
                <div className={css.progressContainer}>
                  <div className={css.progressStatus}>
                    <span>{importStatus || 'Importing...'}</span>
                  </div>
                </div>
              )}

              {importError && <div className={css.errorBanner}>{importError}</div>}
            </div>

            <div className={css.modalFooter}>
              <button
                type="button"
                className={css.cancelBtn}
                onClick={onClose}
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={css.submitBtn}
                disabled={isImporting || !ggufPath.trim() || !ggufName.trim()}
              >
                {isImporting ? 'Registering Model...' : 'Register Local GGUF'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
