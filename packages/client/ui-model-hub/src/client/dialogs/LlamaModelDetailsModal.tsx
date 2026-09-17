import React from 'react'
import { useStoreSnapshot, setLlamaDetailsOpen } from '../store.ts'
import { formatBytes } from '../services/ollama.ts'
import css from './LlamaModelDetailsModal.module.css'

interface LlamaModelDetailsModalProps {
  modelName: string | null
  onClose: () => void
}

export const LlamaModelDetailsModal: React.FC<LlamaModelDetailsModalProps> = ({ modelName, onClose }) => {
  const store = useStoreSnapshot()
  
  if (!store.isLlamaDetailsOpen || !modelName) return null

  const model = store.llamaModels.find(m => m.name === modelName || m.id === modelName)
  if (!model) return null

  const handleClose = () => {
    setLlamaDetailsOpen(false)
    onClose()
  }

  return (
    <div className={css.overlay} onClick={handleClose}>
      <div className={css.modal} onClick={e => e.stopPropagation()}>
        <div className={css.modalHeader}>
          <h3 className={css.modalTitle}>{model.name}</h3>
          <button type="button" className={css.closeBtn} onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className={css.modalBody}>
          <div className={css.infoGrid}>
            <div className={css.infoBox}>
              <span className={css.infoLabel}>Runtime</span>
              <span className={css.infoVal}>llama.cpp</span>
            </div>

            <div className={css.infoBox}>
              <span className={css.infoLabel}>Format</span>
              <span className={css.infoVal}>{model.format}</span>
            </div>

            <div className={css.infoBox}>
              <span className={css.infoLabel}>Quantization</span>
              <span className={css.infoVal}>{model.quantization}</span>
            </div>

            <div className={css.infoBox}>
              <span className={css.infoLabel}>Parameters</span>
              <span className={css.infoVal}>{model.parameterSize}</span>
            </div>

            <div className={css.infoBox}>
              <span className={css.infoLabel}>File Size</span>
              <span className={css.infoVal}>{formatBytes(model.size)}</span>
            </div>

            <div className={css.infoBox}>
              <span className={css.infoLabel}>Context Window</span>
              <span className={css.infoVal}>{(model.contextLength || 8192).toLocaleString()} tokens</span>
            </div>

            <div className={css.infoBox}>
              <span className={css.infoLabel}>Architecture</span>
              <span className={css.infoVal}>{model.architecture}</span>
            </div>

            <div className={css.infoBox}>
              <span className={css.infoLabel}>Status</span>
              <span className={css.infoVal}>{model.status}</span>
            </div>
          </div>
        </div>

        <div className={css.modalFooter}>
          <button type="button" className={css.closeFooterBtn} onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

