import React, { useState } from 'react'
import { usePIDStore, pidStore } from './pidStore'
import css from './PIDNavigator.module.css'

export const PIDNavigator: React.FC = () => {
  const { selectedArea, selectedEquipment, areas, equipments } = usePIDStore()
  const [navSearch, setNavSearch] = useState('')
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({
    'area-100': true,
    'area-200': false,
    'area-300': false,
  })
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'cat-pumps-100': true,
    'cat-exchangers-100': true,
  })

  const toggleArea = (id: string) => {
    setExpandedAreas(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const activateOnKey = (action: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  const query = navSearch.trim().toLowerCase()
  const equipmentMatches = (eqId: string): boolean => {
    if (query === '') return true
    const eq = equipments.find(e => e.id === eqId || e.tag === eqId)
    const tag = eq ? eq.tag : eqId
    return tag.toLowerCase().includes(query)
      || (eq?.name.toLowerCase().includes(query) ?? false)
  }

  return (
    <aside className={css.panel} aria-label="P&ID navigator">
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>P&ID Navigator</h2>
        <svg className={css.closeIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>

      <div className={css.searchWrapper}>
        <input
          type="text"
          className={css.searchInput}
          placeholder="Search in P&ID..."
          aria-label="Search in P&ID"
          value={navSearch}
          onChange={(e) => { setNavSearch(e.target.value) }}
        />
      </div>

      <div className={css.treeArea}>
        <div className={css.rootItem}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="4" />
          </svg>
          <span>CDU-03</span>
        </div>

        {areas.map((area) => {
          const isAreaExpanded = query !== '' || (expandedAreas[area.id] ?? false)
          const isSelected = selectedArea === area.name
          const areaMatches = query === ''
            || area.name.toLowerCase().includes(query)
            || area.categories.some(cat =>
              cat.name.toLowerCase().includes(query)
              || cat.items.some(equipmentMatches),
            )
          if (!areaMatches) return null

          return (
            <div key={area.id} className={css.areaGroup}>
              <div
                className={`${css.areaItem} ${isSelected ? css.selected : ''}`}
                tabIndex={0}
                onClick={() => {
                  toggleArea(area.id)
                  pidStore.setSelectedArea(area.name)
                }}
                onKeyDown={activateOnKey(() => {
                  toggleArea(area.id)
                  pidStore.setSelectedArea(area.name)
                })}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ transform: isAreaExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>{area.name}</span>
              </div>

              {isAreaExpanded && (
                <div className={css.categoryGroup}>
                  {area.categories.map((cat) => {
                    const isCatExpanded = query !== '' || (expandedCategories[cat.id] ?? false)
                    const catMatches = query === ''
                      || cat.name.toLowerCase().includes(query)
                      || cat.items.some(equipmentMatches)
                    if (!catMatches) return null

                    return (
                      <div key={cat.id}>
                        <div
                          className={css.categoryItem}
                          tabIndex={0}
                          onClick={() => { toggleCategory(cat.id) }}
                          onKeyDown={activateOnKey(() => { toggleCategory(cat.id) })}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{ transform: isCatExpanded ? 'rotate(90deg)' : 'none' }}
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                          <span>{cat.name}</span>
                        </div>

                        {isCatExpanded && (
                          <div className={css.equipmentList}>
                            {cat.items.filter(equipmentMatches).map((eqId) => {
                              const eq = equipments.find(e => e.id === eqId || e.tag === eqId)
                              const eqTag = eq ? eq.tag : eqId
                              const isEqActive = selectedEquipment?.tag === eqTag

                              return (
                                <div
                                  key={eqId}
                                  className={`${css.equipmentItem} ${isEqActive ? css.active : ''}`}
                                  tabIndex={0}
                                  onClick={() => { pidStore.setSelectedEquipmentById(eqId) }}
                                  onKeyDown={activateOnKey(() => { pidStore.setSelectedEquipmentById(eqId) })}
                                >
                                  <span aria-hidden="true">•</span>
                                  <span>{eqTag}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
