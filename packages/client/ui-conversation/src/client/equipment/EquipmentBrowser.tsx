/**
 * EquipmentBrowser: Left-side hierarchical equipment tree browser.
 * Displays refinery process units and their equipment categories with counts,
 * expansion/collapse toggles, selection state, and compact search.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/equipment/EquipmentBrowser
 */

import { useState } from 'react'
import {
  IconChevronDownOutline14,
  IconChevronRightOutline14,
  IconCloseOutline16,
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { EquipmentUnitGroup } from './types.ts'
import css from './EquipmentBrowser.module.css'

export interface EquipmentBrowserProps {
  readonly units: readonly EquipmentUnitGroup[]
  readonly selectedUnitId: string
  readonly selectedCategoryId: string
  readonly onSelectCategory?: (unitId: string, categoryId: string) => void
  readonly onCollapse?: () => void
}

function UnitIcon({ color }: { color: EquipmentUnitGroup['color'] }) {
  // Industrial process unit badge with specific tone
  return (
    <span className={`${css.unitIconBadge} ${css[`unitTone_${color}`]}`} aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20M4 20V8l6-3v15M10 20V12l6 3v5M16 20v-8l4 2v6" />
      </svg>
    </span>
  )
}

function CategoryIcon({ name }: { name: string }) {
  const lower = name.toLowerCase()
  if (lower.includes('pump')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 5v-3M19 12h3M12 19v3M5 12H2" />
      </svg>
    )
  }
  if (lower.includes('exchanger')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M8 6v12M12 6v12M16 6v12" />
      </svg>
    )
  }
  if (lower.includes('valve')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="4 6 12 12 4 18 4 6" />
        <polygon points="20 6 12 12 20 18 20 6" />
      </svg>
    )
  }
  if (lower.includes('column') || lower.includes('reactor')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="7" y="3" width="10" height="18" rx="5" />
        <line x1="7" y1="10" x2="17" y2="10" />
        <line x1="7" y1="14" x2="17" y2="14" />
      </svg>
    )
  }
  if (lower.includes('drum') || lower.includes('tank') || lower.includes('vessel')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      </svg>
    )
  }
  if (lower.includes('furnace') || lower.includes('boiler')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2c1 3 4 5 4 9a6 6 0 0 1-12 0c0-4 3-6 4-9 1 2 2 3 4 0z" />
      </svg>
    )
  }
  // Default equipment icon
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="3" />
      <line x1="6" y1="6" x2="6" y2="18" />
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="18" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function EquipmentBrowser({
  units,
  selectedUnitId,
  selectedCategoryId,
  onSelectCategory,
  onCollapse,
}: EquipmentBrowserProps) {
  const [filterQuery, setFilterQuery] = useState('')
  // Keep CDU expanded initially
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({
    cdu: true,
  })

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId],
    }))
  }

  const query = filterQuery.trim().toLowerCase()

  // Filter units and categories by search query
  const filteredUnits = units.map((unit) => {
    if (!query) return unit
    const matchesUnit = unit.name.toLowerCase().includes(query)
    const matchingCategories = unit.categories.filter(cat =>
      cat.name.toLowerCase().includes(query),
    )
    if (matchesUnit) return unit
    if (matchingCategories.length > 0) {
      return { ...unit, categories: matchingCategories }
    }
    return null
  }).filter((u): u is EquipmentUnitGroup => u !== null)

  return (
    <div className={css.browserRoot}>
      {/* Browser Card Header */}
      <div className={css.browserHeader}>
        <h2 className={css.browserTitle}>Equipment Browser</h2>
        {onCollapse && (
          <button
            type="button"
            className={css.closeBtn}
            onClick={onCollapse}
            aria-label="Collapse Equipment Browser"
            title="Collapse browser"
          >
            <IconCloseOutline16 size={14} />
          </button>
        )}
      </div>

      {/* Browser Search Input */}
      <div className={css.searchWrapper}>
        <IconSearchOutline16 size={13} className={css.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={css.browserSearchInput}
          placeholder="Search equipment..."
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)}
          aria-label="Search equipment tree"
        />
      </div>

      {/* Hierarchical Equipment Tree */}
      <nav className={css.treeContainer} aria-label="Equipment hierarchy">
        <ul className={css.unitList} role="tree">
          {filteredUnits.map((unit) => {
            const isExpanded = query ? true : !!expandedUnits[unit.id]

            return (
              <li key={unit.id} className={css.unitItem} role="treeitem" aria-expanded={isExpanded}>
                <button
                  type="button"
                  className={css.unitHeaderBtn}
                  onClick={() => toggleUnit(unit.id)}
                  aria-label={`${unit.name} (${unit.count})`}
                >
                  <span className={css.chevronSlot} aria-hidden="true">
                    {isExpanded ? (
                      <IconChevronDownOutline14 size={12} className={css.chevronIcon} />
                    ) : (
                      <IconChevronRightOutline14 size={12} className={css.chevronIcon} />
                    )}
                  </span>
                  <UnitIcon color={unit.color} />
                  <span className={css.unitName}>{unit.name}</span>
                  <span className={css.countBadge}>({unit.count})</span>
                </button>

                {isExpanded && unit.categories.length > 0 && (
                  <ul className={css.categoryList} role="group">
                    {unit.categories.map((category) => {
                      const isSelected = unit.id === selectedUnitId && category.id === selectedCategoryId

                      return (
                        <li key={category.id} className={css.categoryItem} role="treeitem" aria-selected={isSelected}>
                          <button
                            type="button"
                            className={`${css.categoryBtn} ${isSelected ? css.categorySelected : ''}`}
                            onClick={() => onSelectCategory?.(unit.id, category.id)}
                          >
                            <span className={css.catChevronSlot} aria-hidden="true">
                              {isSelected ? (
                                <IconChevronDownOutline14 size={11} className={css.catChevron} />
                              ) : (
                                <IconChevronRightOutline14 size={11} className={css.catChevron} />
                              )}
                            </span>
                            <span className={css.categoryIconSlot}>
                              <CategoryIcon name={category.name} />
                            </span>
                            <span className={css.categoryName}>{category.name}</span>
                            <span className={css.categoryCount}>({category.count})</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
