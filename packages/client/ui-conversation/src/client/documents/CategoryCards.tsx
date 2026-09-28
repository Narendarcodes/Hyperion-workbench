/**
 * CategoryCards: Top 6 document category summary cards matching reference image.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/documents/CategoryCards
 */

import type { ReactNode } from 'react'
import type { DocumentCategory } from './types.ts'
import css from './CategoryCards.module.css'

export interface CategoryCardsProps {
  readonly categories: readonly DocumentCategory[]
  readonly selectedCategoryId?: string | undefined
  readonly onSelectCategory?: (categoryId: string) => void
}

function renderCategoryIcon(iconType: string): ReactNode {
  switch (iconType) {
    case 'drawing':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
          <circle cx="15" cy="15" r="2" />
        </svg>
      )
    case 'document':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case 'procedure':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="2" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      )
    case 'maintenance':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      )
    case 'report':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="8" y1="18" x2="8" y2="15" />
          <line x1="16" y1="18" x2="16" y2="9" />
        </svg>
      )
    case 'standard':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )
  }
}

export function CategoryCards({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryCardsProps): ReactNode {
  return (
    <div className={css.categoryGrid} role="region" aria-label="Document categories">
      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            className={css.categoryCard}
            data-selected={isSelected}
            onClick={() => onSelectCategory?.(cat.id)}
            aria-label={`${cat.title}, ${cat.count.toLocaleString()} documents`}
          >
            <div className={css.cardContent}>
              <div
                className={css.iconContainer}
                style={{
                  backgroundColor: `${cat.color}15`,
                  color: cat.color,
                }}
                aria-hidden="true"
              >
                {renderCategoryIcon(cat.iconType)}
              </div>
              <div className={css.textColumn}>
                <span className={css.cardTitle}>{cat.title}</span>
                <span className={css.cardCount}>{cat.count.toLocaleString()}</span>
              </div>
            </div>

            <svg
              className={css.chevron}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}
