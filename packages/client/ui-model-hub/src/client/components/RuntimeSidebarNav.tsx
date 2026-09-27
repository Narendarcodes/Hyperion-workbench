import React, { useState, useEffect } from 'react'
import css from './RuntimeSidebarNav.module.css'

export interface RuntimeCategoryCount {
  runtimeId: string
  displayName: string
  connected: boolean
  endpoint: string
  version: string
  totalModels: number
  allCount: number
  llmCount: number
  visionCount: number
  embedCount: number
  ocrCount?: number
}

export interface RuntimeSidebarNavProps {
  runtimes: RuntimeCategoryCount[]
  activeRuntimeId: string
  activeCategory: string
  onSelectRuntimeCategory: (runtimeId: string, category: string) => void
}

export function RuntimeSidebarNav({
  runtimes,
  activeRuntimeId,
  activeCategory,
  onSelectRuntimeCategory,
}: RuntimeSidebarNavProps) {
  // Expanded runtime accordion state (defaults to activeRuntimeId)
  const [expandedRuntime, setExpandedRuntime] = useState<string>(activeRuntimeId || 'ollama')

  useEffect(() => {
    if (activeRuntimeId && activeRuntimeId !== expandedRuntime) {
      setExpandedRuntime(activeRuntimeId)
    }
  }, [activeRuntimeId])

  const toggleRuntime = (runtimeId: string) => {
    if (expandedRuntime === runtimeId) {
      // Keep selected or allow collapse
      setExpandedRuntime(runtimeId)
    } else {
      setExpandedRuntime(runtimeId)
      onSelectRuntimeCategory(runtimeId, 'all')
    }
  }

  return (
    <aside className={css.sidebarNav} aria-label="Model Hub Runtime Navigation">
      <div className={css.navHeader}>
        <span className={css.navHeaderTitle}>RUNTIMES & CATEGORIES</span>
      </div>

      <nav className={css.treeList}>
        {runtimes.map((r) => {
          const isExpanded = expandedRuntime === r.runtimeId
          const isRuntimeActive = activeRuntimeId === r.runtimeId

          const categories = [
            { id: 'all', label: 'All', count: r.allCount },
            { id: 'llm', label: 'LLM', count: r.llmCount },
            { id: 'vision', label: 'Vision', count: r.visionCount },
            { id: 'embedding', label: 'Embedding', count: r.embedCount },
          ]

          if (r.ocrCount && r.ocrCount > 0) {
            categories.push({ id: 'ocr', label: 'OCR', count: r.ocrCount })
          }

          return (
            <div key={r.runtimeId} className={css.treeNode}>
              {/* Accordion Header */}
              <button
                type="button"
                className={`${css.accordionHeader} ${isRuntimeActive ? css.activeRuntime : ''}`}
                onClick={() => toggleRuntime(r.runtimeId)}
              >
                <div className={css.headerLeft}>
                  <span className={css.arrowIcon}>{isExpanded ? '▼' : '▶'}</span>
                  <span className={`${css.statusDot} ${r.connected ? css.online : css.offline}`} />
                  <span className={css.runtimeName}>{r.displayName}</span>
                </div>
                <span className={css.totalBadge}>{r.totalModels}</span>
              </button>

              {/* Nested Categories List */}
              {isExpanded && (
                <div className={css.categoryList}>
                  {categories.map((cat) => {
                    const isCatSelected = isRuntimeActive && activeCategory.toLowerCase() === cat.id.toLowerCase()

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`${css.categoryItem} ${isCatSelected ? css.selectedCat : ''}`}
                        onClick={() => onSelectRuntimeCategory(r.runtimeId, cat.id)}
                      >
                        <span className={css.catLabel}>{cat.label}</span>
                        <span className={`${css.catCount} ${cat.count > 0 ? css.hasModels : ''}`}>
                          ({cat.count})
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
