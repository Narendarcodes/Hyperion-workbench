import React, { useEffect, useState } from 'react'
import { showModel, type OllamaModelInfo } from '../services/ollama'
import css from './ModelDetailsModal.module.css'

interface ModelDetailsModalProps {
  modelName: string | null
  onClose: () => void
}

export const ModelDetailsModal: React.FC<ModelDetailsModalProps> = ({ modelName, onClose }) => {
  const [details, setDetails] = useState<OllamaModelInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!modelName) {
      setDetails(null)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    showModel(modelName)
      .then((data) => {
        if (active) {
          setDetails(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load model details')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [modelName])

  if (!modelName) return null

  const handleCopyModelfile = () => {
    if (!details?.modelfile) return
    navigator.clipboard.writeText(details.modelfile)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={css.overlay} onClick={onClose}>
      <div className={css.modal} onClick={e => e.stopPropagation()}>
        <div className={css.modalHeader}>
          <h3 className={css.modalTitle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Model Details: {modelName}
          </h3>
          <button type="button" className={css.closeBtn} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={css.modalBody}>
          {loading && <div className={css.loading}>Inspecting model metadata from Ollama...</div>}

          {error && <div style={{ color: '#f87171', fontSize: '13px' }}>{error}</div>}

          {details && !loading && (
            <>
              {/* Grid info */}
              <div className={css.infoGrid}>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Architecture</span>
                  <span className={css.infoVal}>{details.details?.family || 'Unknown'}</span>
                </div>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Parameter Size</span>
                  <span className={css.infoVal}>{details.details?.parameter_size || 'N/A'}</span>
                </div>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Quantization</span>
                  <span className={css.infoVal}>{details.details?.quantization_level || 'N/A'}</span>
                </div>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Format</span>
                  <span className={css.infoVal}>{details.details?.format?.toUpperCase() || 'GGUF'}</span>
                </div>
              </div>

              {/* System Prompt */}
              {details.system && (
                <div className={css.section}>
                  <h4 className={css.sectionTitle}>System Prompt</h4>
                  <div className={css.codeBox}>{details.system}</div>
                </div>
              )}

              {/* Parameters */}
              {details.parameters && (
                <div className={css.section}>
                  <h4 className={css.sectionTitle}>Default Parameters</h4>
                  <div className={css.codeBox}>{details.parameters}</div>
                </div>
              )}

              {/* Modelfile */}
              {details.modelfile && (
                <div className={css.section}>
                  <div className={css.sectionTitle}>
                    <span>Modelfile Definition</span>
                    <button type="button" className={css.copyBtn} onClick={handleCopyModelfile}>
                      {copied ? 'Copied!' : 'Copy Modelfile'}
                    </button>
                  </div>
                  <div className={css.codeBox}>{details.modelfile}</div>
                </div>
              )}

              {/* Template */}
              {details.template && (
                <div className={css.section}>
                  <h4 className={css.sectionTitle}>Prompt Template</h4>
                  <div className={css.codeBox}>{details.template}</div>
                </div>
              )}
            </>
          )}
        </div>

        <div className={css.modalFooter}>
          <button type="button" className={css.closeFooterBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
