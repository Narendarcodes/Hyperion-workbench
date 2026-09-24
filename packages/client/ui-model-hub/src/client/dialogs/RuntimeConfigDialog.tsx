import React, { useState, useEffect } from 'react'
import {
  useStoreSnapshot,
  updateRuntimeConfig,
  formatEndpointUrl,
  DEFAULT_RUNTIME_CONFIG,
  type RuntimeConfig,
  type EndpointConfig,
} from '../store.ts'
import { defaultLlama } from '../services/llama.ts'
import { defaultOllama } from '../services/ollama.ts'
import css from './RuntimeConfigDialog.module.css'

interface RuntimeConfigDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const RuntimeConfigDialog: React.FC<RuntimeConfigDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const store = useStoreSnapshot()
  const [activeTab, setActiveTab] = useState<'llama' | 'ollama'>('llama')

  const [llamaConfig, setLlamaConfig] = useState<EndpointConfig>({
    ...DEFAULT_RUNTIME_CONFIG.llama,
  })
  const [ollamaConfig, setOllamaConfig] = useState<EndpointConfig>({
    ...DEFAULT_RUNTIME_CONFIG.ollama,
  })

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLlamaConfig({ ...store.runtimeConfig.llama })
      setOllamaConfig({ ...store.runtimeConfig.ollama })
      setTestResult(null)
    }
  }, [isOpen, store.runtimeConfig])

  if (!isOpen) return null

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      if (activeTab === 'llama') {
        const url = formatEndpointUrl(llamaConfig)
        const result = await defaultLlama.testConnection(url)
        setTestResult(result)
      } else {
        const url = formatEndpointUrl(ollamaConfig)
        const result = await defaultOllama.testConnection(url)
        setTestResult(result)
      }
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    const newConfig: RuntimeConfig = {
      llama: llamaConfig,
      ollama: ollamaConfig,
    }
    updateRuntimeConfig(newConfig)
    onClose()
  }

  const handleReset = () => {
    if (activeTab === 'llama') {
      setLlamaConfig({ ...DEFAULT_RUNTIME_CONFIG.llama })
    } else {
      setOllamaConfig({ ...DEFAULT_RUNTIME_CONFIG.ollama })
    }
    setTestResult(null)
  }

  const currentEndpointUrl =
    activeTab === 'llama'
      ? formatEndpointUrl(llamaConfig)
      : formatEndpointUrl(ollamaConfig)

  return (
    <div
      className={css.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="runtime-config-title"
    >
      <div className={css.modal} onClick={e => e.stopPropagation()}>
        <div className={css.modalHeader}>
          <h3 id="runtime-config-title" className={css.modalTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Runtime Connection Settings
          </h3>
          <button
            type="button"
            className={css.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className={css.modalTabs}>
          <button
            type="button"
            className={`${css.tabBtn} ${activeTab === 'llama' ? css.activeTab : ''}`}
            onClick={() => {
              setActiveTab('llama')
              setTestResult(null)
            }}
          >
            llama.cpp Engine
          </button>
          <button
            type="button"
            className={`${css.tabBtn} ${activeTab === 'ollama' ? css.activeTab : ''}`}
            onClick={() => {
              setActiveTab('ollama')
              setTestResult(null)
            }}
          >
            Ollama Service
          </button>
        </div>

        <div className={css.modalBody}>
          {activeTab === 'llama' ? (
            <>
              <div className={css.formRow}>
                <div className={css.formGroup} style={{ flex: 2 }}>
                  <label className={css.formLabel} htmlFor="llama-host">Host / IP Address</label>
                  <input
                    id="llama-host"
                    type="text"
                    className={css.input}
                    value={llamaConfig.host}
                    onChange={e => setLlamaConfig({ ...llamaConfig, host: e.target.value.trim() })}
                    placeholder="127.0.0.1"
                  />
                </div>
                <div className={css.formGroup} style={{ flex: 1 }}>
                  <label className={css.formLabel} htmlFor="llama-port">Port</label>
                  <input
                    id="llama-port"
                    type="number"
                    className={css.input}
                    value={llamaConfig.port}
                    onChange={e => setLlamaConfig({ ...llamaConfig, port: Number(e.target.value) || 8080 })}
                    placeholder="8080"
                  />
                </div>
                <div className={css.formGroup} style={{ flex: 1 }}>
                  <label className={css.formLabel} htmlFor="llama-protocol">Protocol</label>
                  <select
                    id="llama-protocol"
                    className={css.input}
                    value={llamaConfig.protocol}
                    onChange={e => setLlamaConfig({ ...llamaConfig, protocol: e.target.value as 'http' | 'https' })}
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                  </select>
                </div>
              </div>

              <div className={css.formGroup}>
                <label className={css.formLabel} htmlFor="llama-baseurl">
                  Optional Full Base URL Override
                </label>
                <input
                  id="llama-baseurl"
                  type="text"
                  className={css.input}
                  value={llamaConfig.baseUrl || ''}
                  onChange={e => setLlamaConfig({ ...llamaConfig, baseUrl: e.target.value })}
                  placeholder="e.g. http://127.0.0.1:8080"
                />
                <span className={css.formHint}>
                  Effective Endpoint: <code>{currentEndpointUrl}</code>
                </span>
              </div>
            </>
          ) : (
            <>
              <div className={css.formRow}>
                <div className={css.formGroup} style={{ flex: 2 }}>
                  <label className={css.formLabel} htmlFor="ollama-host">Host / IP Address</label>
                  <input
                    id="ollama-host"
                    type="text"
                    className={css.input}
                    value={ollamaConfig.host}
                    onChange={e => setOllamaConfig({ ...ollamaConfig, host: e.target.value.trim() })}
                    placeholder="127.0.0.1"
                  />
                </div>
                <div className={css.formGroup} style={{ flex: 1 }}>
                  <label className={css.formLabel} htmlFor="ollama-port">Port</label>
                  <input
                    id="ollama-port"
                    type="number"
                    className={css.input}
                    value={ollamaConfig.port}
                    onChange={e => setOllamaConfig({ ...ollamaConfig, port: Number(e.target.value) || 11434 })}
                    placeholder="11434"
                  />
                </div>
                <div className={css.formGroup} style={{ flex: 1 }}>
                  <label className={css.formLabel} htmlFor="ollama-protocol">Protocol</label>
                  <select
                    id="ollama-protocol"
                    className={css.input}
                    value={ollamaConfig.protocol}
                    onChange={e => setOllamaConfig({ ...ollamaConfig, protocol: e.target.value as 'http' | 'https' })}
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                  </select>
                </div>
              </div>

              <div className={css.formGroup}>
                <label className={css.formLabel} htmlFor="ollama-baseurl">
                  Optional Full Base URL Override
                </label>
                <input
                  id="ollama-baseurl"
                  type="text"
                  className={css.input}
                  value={ollamaConfig.baseUrl || ''}
                  onChange={e => setOllamaConfig({ ...ollamaConfig, baseUrl: e.target.value })}
                  placeholder="e.g. http://127.0.0.1:11434"
                />
                <span className={css.formHint}>
                  Effective Endpoint: <code>{currentEndpointUrl}</code>
                </span>
              </div>
            </>
          )}

          <div className={css.testSection}>
            <button
              type="button"
              className={css.testBtn}
              onClick={() => { void handleTestConnection() }}
              disabled={testing}
            >
              {testing ? 'Testing Connection...' : `Test Connection to ${currentEndpointUrl}`}
            </button>

            {testResult && (
              <div className={testResult.success ? css.testSuccess : css.testError}>
                <span>{testResult.success ? '✓' : '⚠️'}</span>
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        <div className={css.modalFooter}>
          <div className={css.footerLeft}>
            <button
              type="button"
              className={css.resetBtn}
              onClick={handleReset}
            >
              Reset to Defaults
            </button>
          </div>
          <div className={css.footerRight}>
            <button
              type="button"
              className={css.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className={css.saveBtn}
              onClick={handleSave}
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
