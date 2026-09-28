import { useSyncExternalStore } from 'react'
import {
  initialEquipments,
  initialLines,
  initialDocuments,
  areaNodes,
} from './pidData'
import type {
  PIDEquipment,
  PIDLine,
  PIDDocument,
  PIDAreaNode,
  PIDLayerState,
} from './types'

export interface PIDState {
  isOpen: boolean
  activeNav: 'pid' | 'plant' | 'home' | 'equipment' | 'investigations' | 'documents' | 'reports' | 'simulation'
  selectedPlant: string
  selectedUnit: string
  selectedPID: string
  selectedArea: string
  selectedEquipment: PIDEquipment | null
  selectedLine: PIDLine | null
  activeEquipmentTab: 'overview' | 'documents' | 'related' | 'history'
  activePIDTab: 'viewer' | 'layers' | 'equipment' | 'lines' | 'loops' | 'annotations'
  visibleLayers: PIDLayerState
  zoomLevel: number
  panOffset: { x: number; y: number }
  searchQuery: string
  filterState: string
  equipments: PIDEquipment[]
  lines: PIDLine[]
  documents: PIDDocument[]
  areas: PIDAreaNode[]
  isAIChatOpen: boolean
  aiChatQuery: string
}

const initialState: PIDState = {
  isOpen: true,
  activeNav: 'pid',
  selectedPlant: 'Plant 01',
  selectedUnit: 'CDU-03',
  selectedPID: 'CDU-03-001',
  selectedArea: 'Area 100 - Crude Preheat',
  selectedEquipment: initialEquipments[0] || null,
  selectedLine: initialLines[0] || null,
  activeEquipmentTab: 'overview',
  activePIDTab: 'viewer',
  visibleLayers: {
    equipment: true,
    lines: true,
    loops: true,
    annotations: true,
  },
  zoomLevel: 100,
  panOffset: { x: 0, y: 0 },
  searchQuery: '',
  filterState: 'all',
  equipments: initialEquipments,
  lines: initialLines,
  documents: initialDocuments,
  areas: areaNodes,
  isAIChatOpen: false,
  aiChatQuery: '',
}

class PIDStore {
  private state: PIDState = { ...initialState }
  private listeners = new Set<() => void>()

  getSnapshot = (): PIDState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setState(updates: Partial<PIDState>): void {
    this.state = { ...this.state, ...updates }
    for (const listener of this.listeners) {
      listener()
    }
  }

  setOpen(isOpen: boolean): void {
    this.setState({ isOpen })
  }

  setActiveNav(activeNav: PIDState['activeNav']): void {
    this.setState({ activeNav, isOpen: true })
  }

  setSelectedEquipment(equipment: PIDEquipment | null): void {
    this.setState({ selectedEquipment: equipment })
  }

  setSelectedEquipmentById(id: string): void {
    const found = this.state.equipments.find(e => e.id === id || e.tag === id)
    if (found) {
      this.setState({ selectedEquipment: found })
    }
  }

  setSelectedLine(line: PIDLine | null): void {
    this.setState({ selectedLine: line })
  }

  setSelectedArea(area: string): void {
    this.setState({ selectedArea: area })
  }

  setActiveEquipmentTab(tab: 'overview' | 'documents' | 'related' | 'history'): void {
    this.setState({ activeEquipmentTab: tab })
  }

  setActivePIDTab(tab: 'viewer' | 'layers' | 'equipment' | 'lines' | 'loops' | 'annotations'): void {
    this.setState({ activePIDTab: tab })
  }

  toggleLayer(layer: keyof PIDLayerState): void {
    this.setState({
      visibleLayers: {
        ...this.state.visibleLayers,
        [layer]: !this.state.visibleLayers[layer],
      },
    })
  }

  setZoomLevel(zoom: number): void {
    const clamped = Math.max(50, Math.min(250, zoom))
    this.setState({ zoomLevel: clamped })
  }

  zoomIn(): void {
    this.setZoomLevel(this.state.zoomLevel + 15)
  }

  zoomOut(): void {
    this.setZoomLevel(this.state.zoomLevel - 15)
  }

  resetZoom(): void {
    this.setState({ zoomLevel: 100, panOffset: { x: 0, y: 0 } })
  }

  setPanOffset(offset: { x: number; y: number }): void {
    this.setState({ panOffset: offset })
  }

  setSearchQuery(searchQuery: string): void {
    this.setState({ searchQuery })
  }

  setFilterState(filterState: string): void {
    this.setState({ filterState })
  }

  openAIChat(query = ''): void {
    const selected = this.state.selectedEquipment
    const defaultQuery = query || (selected ? `Explain the operation and failure modes of ${selected.tag} (${selected.name})` : 'Analyze P&ID CDU-03-001 control loops and process flow.')
    this.setState({ isAIChatOpen: true, aiChatQuery: defaultQuery })
  }

  closeAIChat(): void {
    this.setState({ isAIChatOpen: false })
  }
}

export const pidStore = new PIDStore()

export function openPIDWorkspace(): void {
  pidStore.setOpen(true)
}

export function closePIDWorkspace(): void {
  pidStore.setOpen(false)
}

export function usePIDStore(): PIDState {
  return useSyncExternalStore(pidStore.subscribe, pidStore.getSnapshot)
}
