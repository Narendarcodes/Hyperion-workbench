import React, { useState, useEffect, useRef } from 'react'
import { pullModel, createCustomModel, formatBytes, defaultOllama } from '../services/ollama.ts'
import { refreshAll, selectModelForActiveSession } from '../store.ts'
import css from './AddModelModal.module.css'

interface AddModelModalProps {
  isOpen: boolean
  onClose: () => void
}

interface OllamaLibraryModel {
  name: string
  description: string
  defaultTag: string
  tags: string[]
  parameterSizes: string[]
  capabilities: string[]
}

const OLLAMA_MODEL_CATALOG: OllamaLibraryModel[] = [
  {
    name: 'deepseek-r1',
    description: 'DeepSeek open reasoning and thinking model',
    defaultTag: '1.5b',
    tags: ['1.5b', '7b', '8b', '14b', '32b', '70b'],
    parameterSizes: ['1.5B', '7B', '8B', '14B', '32B', '70B'],
    capabilities: ['reasoning', 'thinking', 'chat'],
  },
  {
    name: 'qwen3.5',
    description: 'Qwen 3.5 multimodal foundation model',
    defaultTag: '4b',
    tags: ['0.8b', '2b', '4b', '9b', '27b', '72b'],
    parameterSizes: ['0.8B', '2B', '4B', '9B', '27B', '72B'],
    capabilities: ['multimodal', 'vision', 'tools'],
  },
  {
    name: 'qwen3',
    description: 'Qwen 3 versatile reasoning and agentic model',
    defaultTag: '8b',
    tags: ['0.6b', '1.7b', '4b', '8b', '14b', '32b'],
    parameterSizes: ['0.6B', '1.7B', '4B', '8B', '14B', '32B'],
    capabilities: ['tools', 'thinking', 'chat'],
  },
  {
    name: 'qwen2.5-coder',
    description: 'Code-specialized model for programming and tool use',
    defaultTag: '1.5b',
    tags: ['0.5b', '1.5b', '3b', '7b', '14b', '32b'],
    parameterSizes: ['0.5B', '1.5B', '3B', '7B', '14B', '32B'],
    capabilities: ['coding', 'tools', 'completion'],
  },
  {
    name: 'llama3.2',
    description: 'Meta lightweight state-of-the-art multilingual model',
    defaultTag: '1b',
    tags: ['1b', '3b'],
    parameterSizes: ['1B', '3B'],
    capabilities: ['chat', 'completion', 'tools'],
  },
  {
    name: 'llama3.3',
    description: 'Meta 70B flagship model with industry-leading performance',
    defaultTag: '70b',
    tags: ['70b'],
    parameterSizes: ['70B'],
    capabilities: ['chat', 'tools', 'coding'],
  },
  {
    name: 'gemma3',
    description: 'Google multimodal lightweight and high-efficiency model',
    defaultTag: '4b',
    tags: ['1b', '4b', '12b', '27b'],
    parameterSizes: ['1B', '4B', '12B', '27B'],
    capabilities: ['vision', 'multimodal', 'chat'],
  },
  {
    name: 'gemma2',
    description: 'Google high-performance general language model',
    defaultTag: '2b',
    tags: ['2b', '9b', '27b'],
    parameterSizes: ['2B', '9B', '27B'],
    capabilities: ['chat', 'completion'],
  },
  {
    name: 'phi4',
    description: 'Microsoft 14B compact reasoning powerhouse',
    defaultTag: '14b',
    tags: ['14b'],
    parameterSizes: ['14B'],
    capabilities: ['reasoning', 'math', 'chat'],
  },
  {
    name: 'phi3',
    description: 'Microsoft compact high-capability model',
    defaultTag: 'mini',
    tags: ['mini', 'medium'],
    parameterSizes: ['3.8B', '14B'],
    capabilities: ['chat', 'reasoning'],
  },
  {
    name: 'mistral',
    description: 'Mistral AI general-purpose 7B foundation model',
    defaultTag: '7b',
    tags: ['7b'],
    parameterSizes: ['7B'],
    capabilities: ['chat', 'completion', 'tools'],
  },
  {
    name: 'llava',
    description: 'Large Language and Vision Assistant for image reasoning',
    defaultTag: '7b',
    tags: ['7b', '13b', '34b'],
    parameterSizes: ['7B', '13B', '34B'],
    capabilities: ['vision', 'ocr', 'chat'],
  },
  {
    name: 'deepseek-coder-v2',
    description: 'DeepSeek MoE coding and math model',
    defaultTag: '16b',
    tags: ['16b'],
    parameterSizes: ['16B'],
    capabilities: ['coding', 'tools', 'math'],
  },
  {
    name: 'nomic-embed-text',
    description: 'High-performing local text embedding model for RAG',
    defaultTag: 'latest',
    tags: ['latest'],
    parameterSizes: ['137M'],
    capabilities: ['embedding', 'rag'],
  },
  {
    name: 'command-r',
    description: 'Cohere 35B model optimized for RAG and tool workflows',
    defaultTag: '35b',
    tags: ['35b'],
    parameterSizes: ['35B'],
    capabilities: ['tools', 'rag', 'chat'],
  },
]

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
  const [pullErrorDetails, setPullErrorDetails] = useState<string | null>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)

  // Search & suggestions state
  const [suggestions, setSuggestions] = useState<OllamaLibraryModel[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [noMatchWarning, setNoMatchWarning] = useState<string | null>(null)
  const [allowManualPull, setAllowManualPull] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)

  // Airgap / GGUF import state
  const [ggufPath, setGgufPath] = useState('')
  const [ggufName, setGgufName] = useState('')
  const [ggufSystemPrompt, setGgufSystemPrompt] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // Debounced search over catalog
  useEffect(() => {
    if (!pullModelName.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      setNoMatchWarning(null)
      return
    }

    const timer = setTimeout(() => {
      const q = pullModelName.trim().toLowerCase()
      const matches = OLLAMA_MODEL_CATALOG.filter((m) => {
        if (m.name.toLowerCase().includes(q)) return true
        if (m.description.toLowerCase().includes(q)) return true
        if (m.capabilities.some(c => c.toLowerCase().includes(q))) return true
        if (m.tags.some(t => `${m.name}:${t}`.toLowerCase().includes(q))) return true
        return false
      })
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
      setHighlightedIndex(-1)
    }, 200)

    return () => clearTimeout(timer)
  }, [pullModelName])

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setPullError(null)
      setPullErrorDetails(null)
      setShowErrorDetails(false)
      setNoMatchWarning(null)
      setAllowManualPull(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSelectSuggestion = (model: OllamaLibraryModel) => {
    const fullIdentifier = `${model.name}:${model.defaultTag}`
    setPullModelName(fullIdentifier)
    setShowSuggestions(false)
    setNoMatchWarning(null)
    setAllowManualPull(true)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Escape') {
        setShowSuggestions(false)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault()
        const selected = suggestions[highlightedIndex]
        if (selected) {
          handleSelectSuggestion(selected)
        }
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const executePull = async (targetModel: string) => {
    setIsPulling(true)
    setPullError(null)
    setPullErrorDetails(null)
    setShowErrorDetails(false)
    setPullStatus('Initiating download from Ollama registry...')
    setPullProgress(null)
    setPullBytes(null)

    try {
      await pullModel(targetModel, (progress) => {
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

      setPullStatus('Download complete! Model registered in local catalog.')
      await refreshAll()
      await selectModelForActiveSession(targetModel)
      setTimeout(() => {
        setIsPulling(false)
        onClose()
      }, 1000)
    } catch (err: unknown) {
      setIsPulling(false)
      const rawMsg = err instanceof Error ? err.message : String(err)
      let userMsg = rawMsg

      if (rawMsg.toLowerCase().includes('bad request') || rawMsg.toLowerCase().includes('not found')) {
        userMsg = `The Ollama registry did not recognize model "${targetModel}". Please check the identifier or pick a verified model from the library suggestions.`
      } else if (rawMsg.toLowerCase().includes('failed to fetch') || rawMsg.toLowerCase().includes('econnrefused')) {
        userMsg = `Could not connect to Ollama at ${defaultOllama.getBaseUrl()}. Please confirm the Ollama service is running.`
      } else if (rawMsg.toLowerCase().includes('network') || rawMsg.toLowerCase().includes('abort')) {
        userMsg = 'Network connection interrupted while downloading weights from registry.'
      }

      setPullError(userMsg)
      setPullErrorDetails(rawMsg !== userMsg ? rawMsg : null)
    }
  }

  const handlePullSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = pullModelName.trim()
    if (!trimmed) return

    setShowSuggestions(false)

    // Check if model identifier is recognized
    if (!allowManualPull) {
      const q = trimmed.toLowerCase()
      const baseName = q.split(':')[0] || ''
      const isKnown = OLLAMA_MODEL_CATALOG.some(
        m => m.name.toLowerCase() === baseName || m.tags.some(t => `${m.name}:${t}`.toLowerCase() === q),
      )

      if (!isKnown) {
        setNoMatchWarning(`No exact match found for "${trimmed}" in the standard model library.`)
        return
      }
    }

    setNoMatchWarning(null)
    await executePull(trimmed)
  }

  const handleImportGGUF = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ggufPath.trim() || !ggufName.trim()) {
      setImportError('Please provide both local GGUF path and model registration name.')
      return
    }

    setIsImporting(true)
    setImportError(null)
    setImportStatus('Compiling Modelfile and importing weights...')

    try {
      const cleanPath = ggufPath.trim().replace(/\\/g, '/')
      let modelfile = `FROM "${cleanPath}"\n`
      if (ggufSystemPrompt.trim()) {
        modelfile += `SYSTEM """${ggufSystemPrompt.trim()}"""\n`
      }

      await createCustomModel({
        name: ggufName.trim(),
        modelfile,
      })

      setImportStatus('Model imported successfully!')
      await refreshAll()
      await selectModelForActiveSession(ggufName.trim())
      setTimeout(() => {
        setIsImporting(false)
        onClose()
      }, 1000)
    } catch (err: unknown) {
      setIsImporting(false)
      setImportError(err instanceof Error ? err.message : 'Failed to import local GGUF model')
    }
  }

  return (
    <div
      className={css.overlay}
      onClick={() => !isPulling && !isImporting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-model-title"
    >
      <div className={css.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={css.modalHeader}>
          <h3 id="add-model-title" className={css.modalTitle}>
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
            aria-label="Close dialog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab Toggle */}
        <div className={css.modalTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'library'}
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
            role="tab"
            aria-selected={tab === 'airgap'}
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
          <form onSubmit={handlePullSubmit}>
            <div className={css.modalBody}>
              <div className={css.formGroup}>
                <label className={css.formLabel} htmlFor="model-identifier-input">
                  Model Identifier / Search Library
                </label>
                <div className={css.comboboxWrapper}>
                  <input
                    id="model-identifier-input"
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={showSuggestions}
                    aria-controls="model-suggestions-list"
                    aria-activedescendant={
                      highlightedIndex >= 0 ? `suggestion-item-${highlightedIndex}` : undefined
                    }
                    className={css.input}
                    placeholder="Search or enter model (e.g. qwen, deepseek-r1, llama3.2)..."
                    value={pullModelName}
                    onChange={(e) => {
                      setPullModelName(e.target.value)
                      setAllowManualPull(false)
                      setNoMatchWarning(null)
                    }}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true)
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={isPulling}
                    autoComplete="off"
                    autoFocus
                  />

                  {showSuggestions && suggestions.length > 0 && (
                    <ul
                      id="model-suggestions-list"
                      ref={listboxRef}
                      role="listbox"
                      className={css.suggestionsDropdown}
                    >
                      {suggestions.map((m, idx) => (
                        <li
                          key={m.name}
                          id={`suggestion-item-${idx}`}
                          role="option"
                          aria-selected={highlightedIndex === idx}
                          className={`${css.suggestionItem} ${
                            highlightedIndex === idx ? css.highlighted : ''
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleSelectSuggestion(m)
                          }}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                        >
                          <div className={css.suggestionHeader}>
                            <span className={css.suggestionName}>
                              {m.name}:{m.defaultTag}
                            </span>
                            <span className={css.suggestionSizes}>
                              {m.parameterSizes.join(' · ')}
                            </span>
                          </div>
                          <div className={css.suggestionMeta}>
                            <span>{m.description}</span>
                            {m.capabilities.map(cap => (
                              <span key={cap} className={css.suggestionCap}>
                                {cap}
                              </span>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className={css.formHint}>
                  Type a model family (e.g. <code>qwen</code>, <code>deepseek</code>, <code>llama</code>)
                  to browse recommendations, or type a custom tag.
                </span>
              </div>

              {/* No match validation warning */}
              {noMatchWarning && (
                <div className={css.noMatchWarning}>
                  <div>{noMatchWarning}</div>
                  <div className={css.noMatchActions}>
                    <button
                      type="button"
                      className={css.warningActionBtn}
                      onClick={() => {
                        setNoMatchWarning(null)
                        inputRef.current?.focus()
                      }}
                    >
                      Search Again
                    </button>
                    <button
                      type="button"
                      className={css.warningActionBtn}
                      onClick={() => {
                        setAllowManualPull(true)
                        setNoMatchWarning(null)
                        void executePull(pullModelName.trim())
                      }}
                    >
                      Use "{pullModelName.trim()}" Anyway
                    </button>
                    <button
                      type="button"
                      className={css.warningActionBtn}
                      onClick={() => {
                        setNoMatchWarning(null)
                        setPullModelName('')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Curated Recommendations */}
              <div className={css.formGroup}>
                <label className={css.formLabel}>Recommended Models:</label>
                <div className={css.curatedPills}>
                  {RECOMMENDED_MODELS.map(m => (
                    <button
                      key={m.name}
                      type="button"
                      className={css.pill}
                      onClick={() => {
                        setPullModelName(m.name)
                        setAllowManualPull(true)
                        setNoMatchWarning(null)
                        setShowSuggestions(false)
                      }}
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
                    <span>{pullStatus || 'Downloading...'}</span>
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

              {/* Actionable Error Banner */}
              {pullError && (
                <div className={css.errorBanner}>
                  <div>{pullError}</div>
                  {pullErrorDetails && (
                    <div>
                      <button
                        type="button"
                        className={css.errorToggle}
                        onClick={() => setShowErrorDetails(!showErrorDetails)}
                      >
                        {showErrorDetails ? 'Hide technical details' : 'View technical details'}
                      </button>
                      {showErrorDetails && (
                        <div className={css.errorDetails}>{pullErrorDetails}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                <label className={css.formLabel} htmlFor="gguf-path-input">
                  Absolute Local GGUF Path
                </label>
                <input
                  id="gguf-path-input"
                  type="text"
                  className={css.input}
                  placeholder="e.g. C:\models\DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf"
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
                <label className={css.formLabel} htmlFor="gguf-name-input">
                  Registered Model Name
                </label>
                <input
                  id="gguf-name-input"
                  type="text"
                  className={css.input}
                  placeholder="e.g. custom-deepseek:latest"
                  value={ggufName}
                  onChange={e => setGgufName(e.target.value)}
                  disabled={isImporting}
                />
              </div>

              <div className={css.formGroup}>
                <label className={css.formLabel} htmlFor="gguf-prompt-input">
                  Optional System Prompt
                </label>
                <textarea
                  id="gguf-prompt-input"
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
