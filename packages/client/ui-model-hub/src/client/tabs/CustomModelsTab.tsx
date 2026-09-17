import { useState, useMemo } from 'react'
import { defaultOllama } from '../services/ollama.ts'
import { modelHubStore, type ModelHubState } from '../store.ts'
import css from './CustomModelsTab.module.css'

export interface CustomModelsTabProps {
  storeState: ModelHubState
}

export function CustomModelsTab({ storeState }: CustomModelsTabProps) {
  const [name, setName] = useState('')
  const [baseModel, setBaseModel] = useState(
    storeState.models[0]?.name || 'gemma4:e4b',
  )
  const [systemPrompt, setSystemPrompt] = useState(
    'You are an expert AI assistant operating in a sovereign, local engineering environment.',
  )
  const [temperature, setTemperature] = useState(0.7)
  const [contextLength, setContextLength] = useState(8192)
  const [topP, setTopP] = useState(0.9)
  const [stopSequences, setStopSequences] = useState('')
  const [creating, setCreating] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; error?: boolean } | null>(null)

  // Generate preview of Modelfile
  const modelfilePreview = useMemo(() => {
    let mf = `FROM ${baseModel || 'base-model'}\n\n`
    if (systemPrompt.trim()) {
      mf += `SYSTEM """${systemPrompt.trim()}"""\n\n`
    }
    mf += `PARAMETER temperature ${temperature}\n`
    mf += `PARAMETER num_ctx ${contextLength}\n`
    mf += `PARAMETER top_p ${topP}\n`
    if (stopSequences.trim()) {
      stopSequences.split(',').forEach(s => {
        if (s.trim()) mf += `PARAMETER stop "${s.trim()}"\n`
      })
    }
    return mf
  }, [baseModel, systemPrompt, temperature, contextLength, topP, stopSequences])

  const handleCreate = async () => {
    if (!name.trim()) {
      setStatusMessage({ text: 'Please enter a model name.', error: true })
      return
    }
    setCreating(true)
    setStatusMessage(null)

    try {
      await defaultOllama.createCustomModel(name.trim(), modelfilePreview)
      setStatusMessage({ text: `✓ Custom model "${name.trim()}" created successfully!` })
      await modelHubStore.refreshAll()
      setName('')
    } catch (err) {
      setStatusMessage({
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        error: true,
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={css.root}>
      {/* Form Card */}
      <div className={css.formCard}>
        <div>
          <h3 className={css.cardTitle}>Create Custom Model</h3>
          <div className={css.cardSubtitle}>
            Configure a specialized local model by packaging system instructions and hyper-parameters over an existing base model.
          </div>
        </div>

        {statusMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              background: statusMessage.error ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: statusMessage.error ? '#fca5a5' : '#86efac',
              border: `1px solid ${statusMessage.error ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            }}
          >
            {statusMessage.text}
          </div>
        )}

        <div className={css.grid2}>
          <div className={css.fieldGroup}>
            <label className={css.label}>Model Name</label>
            <input
              type="text"
              className={css.input}
              placeholder="e.g. HYPERION-Engineering"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className={css.fieldGroup}>
            <label className={css.label}>Base Model</label>
            <select
              className={css.select}
              value={baseModel}
              onChange={e => setBaseModel(e.target.value)}
            >
              {storeState.models.map(m => (
                <option key={m.name} value={m.name}>
                  {m.name} ({m.details?.parameter_size || 'local'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={css.fieldGroup}>
          <label className={css.label}>System Instructions</label>
          <textarea
            className={css.textarea}
            placeholder="Define the model's persona, sovereign role, formatting, or task rules..."
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
          />
        </div>

        <div className={css.grid2}>
          <div className={css.fieldGroup}>
            <label className={css.label}>Temperature ({temperature})</label>
            <div className={css.sliderRow}>
              <input
                type="range"
                className={css.slider}
                min="0.0"
                max="2.0"
                step="0.05"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
              />
              <span className={css.sliderValue}>{temperature.toFixed(2)}</span>
            </div>
          </div>

          <div className={css.fieldGroup}>
            <label className={css.label}>Context Window (num_ctx)</label>
            <select
              className={css.select}
              value={contextLength}
              onChange={e => setContextLength(parseInt(e.target.value, 10))}
            >
              <option value="2048">2,048 tokens (2K)</option>
              <option value="4096">4,096 tokens (4K)</option>
              <option value="8192">8,192 tokens (8K - Recommended)</option>
              <option value="16384">16,384 tokens (16K)</option>
              <option value="32768">32,768 tokens (32K)</option>
              <option value="65536">65,536 tokens (64K)</option>
            </select>
          </div>
        </div>

        <div className={css.grid2}>
          <div className={css.fieldGroup}>
            <label className={css.label}>Top-P ({topP})</label>
            <div className={css.sliderRow}>
              <input
                type="range"
                className={css.slider}
                min="0.1"
                max="1.0"
                step="0.05"
                value={topP}
                onChange={e => setTopP(parseFloat(e.target.value))}
              />
              <span className={css.sliderValue}>{topP.toFixed(2)}</span>
            </div>
          </div>

          <div className={css.fieldGroup}>
            <label className={css.label}>Stop Sequences (comma separated)</label>
            <input
              type="text"
              className={css.input}
              placeholder="e.g. <|endoftext|>, User:"
              value={stopSequences}
              onChange={e => setStopSequences(e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          className={css.createBtn}
          disabled={creating || !name.trim()}
          onClick={() => { void handleCreate() }}
        >
          {creating ? 'Building & Registering Custom Model...' : 'Build Custom Model'}
        </button>
      </div>

      {/* Modelfile Preview Card */}
      <div className={css.previewCard}>
        <h4 className={css.cardTitle} style={{ fontSize: 13 }}>Generated Modelfile</h4>
        <div className={css.cardSubtitle}>Native Ollama compilation format</div>
        <pre className={css.codeBlock}>{modelfilePreview}</pre>
      </div>
    </div>
  )
}
