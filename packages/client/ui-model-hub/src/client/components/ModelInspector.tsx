import React, { useState } from 'react'
import type { NormalizedModel } from '../services/normalization.ts'
import { formatBytes } from '../services/ollama.ts'
import css from './ModelInspector.module.css'

interface ModelInspectorProps {
  model: NormalizedModel | null
  onClose: () => void
  onLoad: (m: NormalizedModel) => void
  onUnload: (m: NormalizedModel) => void
  onUse: (m: NormalizedModel) => void
}

export const ModelInspector: React.FC<ModelInspectorProps> = ({
  model,
  onClose,
  onLoad,
  onUnload,
  onUse,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'capabilities' | 'benchmarks' | 'config'>('overview')

  if (!model) {
    return (
      <aside className={css.panel}>
        <div className={css.emptyState}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>Select a model card to inspect metadata, runtime capabilities, and configuration.</div>
        </div>
      </aside>
    )
  }

  const allCapabilities = [
    { key: 'text', label: 'Text Generation / Chat' },
    { key: 'vision', label: 'Vision / Image Analysis' },
    { key: 'audio', label: 'Audio / ASR' },
    { key: 'tools', label: 'Tools / Function Calling' },
    { key: 'embedding', label: 'Text Embedding / RAG' },
    { key: 'ocr', label: 'Precision OCR' },
    { key: 'code', label: 'Code Generation' },
    { key: 'reasoning', label: 'Chain-of-Thought Reasoning' },
    { key: 'multimodal', label: 'Multimodal Input/Output' },
  ]

  const activeCapsSet = new Set(model.capabilities.map(c => c.toLowerCase()))
  for (const t of model.modelTypes) {
    activeCapsSet.add(t.toLowerCase())
  }

  return (
    <aside className={css.panel}>
      <div className={css.panelHeader}>
        <div className={css.headerInfo}>
          <div className={css.modelAvatar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
            </svg>
          </div>
          <div className={css.headerTitles}>
            <div className={css.title} title={model.name}>
              {model.name}
            </div>
            <div className={css.subtitle}>
              <span>{model.runtimeDisplayName}</span>
              <span>· {model.architecture}</span>
            </div>
          </div>
        </div>
        <button type="button" className={css.closeBtn} onClick={onClose} title="Close Inspector">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <nav className={css.tabNav} role="tablist">
        <button
          type="button"
          className={`${css.tabBtn} ${activeTab === 'overview' ? css.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`${css.tabBtn} ${activeTab === 'capabilities' ? css.active : ''}`}
          onClick={() => setActiveTab('capabilities')}
        >
          Capabilities
        </button>
        <button
          type="button"
          className={`${css.tabBtn} ${activeTab === 'benchmarks' ? css.active : ''}`}
          onClick={() => setActiveTab('benchmarks')}
        >
          Benchmarks
        </button>
        <button
          type="button"
          className={`${css.tabBtn} ${activeTab === 'config' ? css.active : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Configuration
        </button>
      </nav>

      <div className={css.panelBody}>
        {activeTab === 'overview' && (
          <>
            <div className={css.section}>
              <span className={css.sectionTitle}>Identity & Status</span>
              <div className={css.grid2}>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Status</span>
                  <span className={css.infoValue} style={{ color: model.loaded ? '#16a34a' : '#64748b' }}>
                    {model.loaded ? 'Loaded in VRAM' : 'Installed'}
                  </span>
                </div>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Runtime</span>
                  <span className={css.infoValue}>{model.runtimeDisplayName}</span>
                </div>
              </div>
            </div>

            <div className={css.section}>
              <span className={css.sectionTitle}>Model Specifications</span>
              <div className={css.grid2}>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Parameters</span>
                  <span className={css.infoValue}>{model.parameterSize}</span>
                </div>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Size on Disk</span>
                  <span className={css.infoValue}>{formatBytes(model.size)}</span>
                </div>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Context Window</span>
                  <span className={css.infoValue}>{model.contextLength.toLocaleString()} tokens</span>
                </div>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Quantization</span>
                  <span className={css.infoValue}>{model.quantization}</span>
                </div>
              </div>
            </div>

            <div className={css.section}>
              <span className={css.sectionTitle}>Architecture & Format</span>
              <div className={css.grid2}>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Architecture</span>
                  <span className={css.infoValue}>{model.architecture}</span>
                </div>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Format</span>
                  <span className={css.infoValue}>{model.details?.format || 'GGUF'}</span>
                </div>
              </div>
            </div>

            {model.vramUsageMB !== undefined && (
              <div className={css.section}>
                <span className={css.sectionTitle}>Memory Allocation</span>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>VRAM Allocation</span>
                  <span className={css.infoValue}>{model.vramUsageMB} MB</span>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'capabilities' && (
          <div className={css.section}>
            <span className={css.sectionTitle}>Supported Capabilities Matrix</span>
            <div className={css.capMatrix}>
              {allCapabilities.map((cap) => {
                const isSupported =
                  activeCapsSet.has(cap.key) ||
                  (cap.key === 'text' && model.modelTypes.includes('LLM')) ||
                  (cap.key === 'vision' && model.modelTypes.includes('Vision')) ||
                  (cap.key === 'ocr' && model.modelTypes.includes('OCR')) ||
                  (cap.key === 'embedding' && model.modelTypes.includes('Embedding')) ||
                  (cap.key === 'code' && model.modelTypes.includes('Code')) ||
                  (cap.key === 'reasoning' && model.modelTypes.includes('Reasoning')) ||
                  (cap.key === 'tools' && model.modelTypes.includes('Tools'))

                return (
                  <div key={cap.key} className={`${css.capItem} ${isSupported ? css.active : ''}`}>
                    <span>{isSupported ? '✓' : '•'}</span>
                    <span>{cap.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'benchmarks' && (
          <div className={css.section}>
            <span className={css.sectionTitle}>Local Benchmark Results</span>
            <div className={css.infoBox} style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'center', padding: '16px' }}>
              <span className={css.infoLabel}>No local benchmark metrics recorded for this model.</span>
              <span className={css.infoValue} style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Run an air-gapped benchmark task to record local tokens/sec and latency metrics.
              </span>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <>
            <div className={css.section}>
              <span className={css.sectionTitle}>Runtime Parameters</span>
              <div className={css.grid2}>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Default Temp</span>
                  <span className={css.infoValue}>0.70</span>
                </div>
                <div className={css.infoBox}>
                  <span className={css.infoLabel}>Top-P</span>
                  <span className={css.infoValue}>0.90</span>
                </div>
              </div>
            </div>

            {model.details?.digest && (
              <div className={css.section}>
                <span className={css.sectionTitle}>Model Digest / Hash</span>
                <div className={css.codeBox}>{model.details.digest}</div>
              </div>
            )}

            {model.details?.path && (
              <div className={css.section}>
                <span className={css.sectionTitle}>File Path</span>
                <div className={css.codeBox}>{model.details.path}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className={css.panelFooter}>
        <button
          type="button"
          className={`${css.footerBtn} ${css.btnPrimary}`}
          onClick={() => onUse(model)}
        >
          Use in Active Session
        </button>
        {model.loaded ? (
          <button
            type="button"
            className={`${css.footerBtn} ${css.btnSecondary}`}
            onClick={() => onUnload(model)}
          >
            Unload
          </button>
        ) : (
          <button
            type="button"
            className={`${css.footerBtn} ${css.btnSecondary}`}
            onClick={() => onLoad(model)}
          >
            Load
          </button>
        )}
      </div>
    </aside>
  )
}
