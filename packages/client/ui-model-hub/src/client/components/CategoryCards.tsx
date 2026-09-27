import React from 'react'
import type { ModelType } from '../services/normalization.ts'
import css from './CategoryCards.module.css'

export interface CategoryCardData {
  type: ModelType | 'all'
  title: string
  count: number
  description: string
}

interface CategoryCardsProps {
  categories: CategoryCardData[]
  selectedCategory: string
  onSelectCategory: (cat: string) => void
}

export const CategoryCards: React.FC<CategoryCardsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const getCategoryIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'llm':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="8" rx="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" />
          </svg>
        )
      case 'vision':
      case 'multimodal':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )
      case 'embedding':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        )
      case 'custom':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )
      case 'ocr':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <line x1="7" y1="8" x2="17" y2="8" />
          </svg>
        )
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
          </svg>
        )
    }
  }

  return (
    <div className={css.container}>
      {categories.map((cat) => {
        const isSelected = selectedCategory.toLowerCase() === cat.type.toLowerCase()

        return (
          <div
            key={cat.type}
            className={`${css.card} ${isSelected ? css.selected : ''}`}
            onClick={() => onSelectCategory(cat.type)}
          >
            <div className={css.cardHeader}>
              <div className={css.titleGroup}>
                <span className={css.icon}>{getCategoryIcon(cat.type)}</span>
                <span className={css.title}>{cat.title}</span>
              </div>
              <span className={css.badge}>
                {cat.count} {cat.count === 1 ? 'Model' : 'Models'}
              </span>
            </div>
            <div className={css.description}>{cat.description}</div>
          </div>
        )
      })}
    </div>
  )
}
