import React from 'react'
import type { NormalizedModel } from '../services/normalization.ts'
import { formatBytes } from '../services/ollama.ts'
import { ModelLogo } from './ModelLogo.tsx'
import css from './ModelCard.module.css'

interface ModelCardProps {
  model: NormalizedModel
  isSelected?: boolean
  actionLoading?: boolean
  onLoad: (m: NormalizedModel, e: React.MouseEvent) => void
  onUnload: (m: NormalizedModel, e: React.MouseEvent) => void
  onUse: (m: NormalizedModel, e: React.MouseEvent) => void
  onSelect: (m: NormalizedModel) => void
  onDelete?: (m: NormalizedModel, e: React.MouseEvent) => void
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isSelected = false,
  actionLoading = false,
  onLoad,
  onUnload,
  onUse,
  onSelect,
  onDelete,
}) => {
  const isLoaded = model.loaded
  const isOllama = model.runtime === 'ollama' || model.runtime === 'custom'

  const primaryType = model.modelTypes[0] || 'LLM'
  const capabilityTags = model.capabilities.filter(c => c.toLowerCase() !== primaryType.toLowerCase())

  const runtimeBadgeText = model.runtime === 'llama.cpp'
    ? 'LLAMA.CPP INFERENCE'
    : model.runtime === 'custom'
    ? 'CUSTOM INFERENCE'
    : 'OLLAMA INFERENCE'

  const runtimeStyleClass = model.runtime === 'llama.cpp'
    ? css.llamacpp
    : model.runtime === 'custom'
    ? css.custom
    : css.ollama

  return (
    <div
      className={`${css.card} ${isSelected ? css.selected : ''}`}
      onClick={() => onSelect(model)}
    >
      {/* Card Header: Authentic Model Logo, Name, Explicit Runtime Inference Tag, Status Pill */}
      <div className={css.cardHeader}>
        <div className={css.modelIdentity}>
          <ModelLogo name={model.name} architecture={model.architecture} family={model.details?.family} size={36} />
          <div className={css.modelTitles}>
            <div className={css.modelName} title={model.name}>
              {model.name}
            </div>
            <div className={css.modelMetaSub}>
              <span className={`${css.runtimeTag} ${runtimeStyleClass}`}>{runtimeBadgeText}</span>
              <span>· {model.architecture}</span>
            </div>
          </div>
        </div>

        <span className={`${css.statusPill} ${isLoaded ? css.loaded : css.installed}`}>
          <span className={css.pulseDot} />
          {isLoaded ? 'Loaded' : 'Installed'}
        </span>
      </div>

      {/* Explicit Classification Block: Model Type vs Capabilities */}
      <div className={css.classificationBlock}>
        <div className={css.primaryTypeLabel}>{primaryType}</div>
        {capabilityTags.length > 0 && (
          <div className={css.capabilitiesRow}>
            {capabilityTags.slice(0, 3).map(c => (
              <span key={c} className={css.capChip}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Technical Metadata Specs Grid */}
      <div className={css.specsGrid}>
        <div className={css.specBox}>
          <span className={css.specLabel}>Params</span>
          <span className={css.specValue}>{model.parameterSize}</span>
        </div>
        <div className={css.specBox}>
          <span className={css.specLabel}>Size</span>
          <span className={css.specValue}>{formatBytes(model.size)}</span>
        </div>
        <div className={css.specBox}>
          <span className={css.specLabel}>Context</span>
          <span className={css.specValue}>{Math.round(model.contextLength / 1024)}K</span>
        </div>
        <div className={css.specBox}>
          <span className={css.specLabel}>Quant</span>
          <span className={css.specValue}>{model.quantization}</span>
        </div>
      </div>

      {/* Model Actions Row */}
      <div className={css.actionsRow}>
        <div className={css.leftActions}>
          {isLoaded ? (
            <button
              type="button"
              className={`${css.btn} ${css.btnUnload}`}
              disabled={actionLoading}
              onClick={e => onUnload(model, e)}
              title="Unload from VRAM"
            >
              {actionLoading ? '...' : 'Unload'}
            </button>
          ) : (
            <button
              type="button"
              className={`${css.btn} ${css.btnLoad}`}
              disabled={actionLoading}
              onClick={e => onLoad(model, e)}
              title="Load into GPU VRAM"
            >
              {actionLoading ? '...' : 'Load'}
            </button>
          )}

          <button
            type="button"
            className={`${css.btn} ${css.btnUse}`}
            onClick={e => onUse(model, e)}
            title="Use as active model in session"
          >
            Use
          </button>
        </div>

        <div className={css.rightActions}>
          <button
            type="button"
            className={`${css.btn} ${css.btnSecondary}`}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(model)
            }}
          >
            Details
          </button>

          {isOllama && onDelete && (
            <button
              type="button"
              className={`${css.btn} ${css.btnDelete}`}
              onClick={e => onDelete(model, e)}
              title="Delete model"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
