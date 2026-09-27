import { useSyncExternalStore } from 'react'

export interface SystemNotification {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  route?: string
  entityId?: string
}

export interface AuditEvent {
  id: string
  timestamp: string
  user: string
  action: string
  category: 'P&ID' | 'Equipment' | 'Investigation' | 'Document' | 'Settings' | 'Sovereignty' | 'Model Router'
  details: string
}

export interface Investigation {
  id: string
  title: string
  description: string
  plant: string
  unit: string
  area: string
  equipmentId?: string
  priority: 'High' | 'Medium' | 'Low' | 'Critical'
  status: 'Open' | 'In Review' | 'Resolved'
  assignedUser: string
  createdAt: string
  evidenceCount: number
}

export interface DocumentItem {
  id: string
  title: string
  type: 'P&ID' | 'Datasheet' | 'Manual' | 'Report' | 'PFD' | 'Inspection'
  unit: string
  equipmentTag?: string
  updatedAt: string
  size: string
  status: 'Approved' | 'Draft' | 'Under Review'
}

export interface EquipmentItem {
  id: string
  tag: string
  name: string
  category: 'Pump' | 'Exchanger' | 'Tower' | 'Vessel'
  unit: string
  area: string
  status: 'In Service' | 'Standby' | 'Maintenance' | 'Offline'
  designPress: string
  operatingPress: string
  temp: string
}

export interface ModelRouteRule {
  id: string
  name: string
  taskType: string
  primaryModel: string
  fallbackModel: string
  latencySLA: string
  enabled: boolean
}

export interface SovereigntyPolicy {
  id: string
  label: string
  description: string
  enabled: boolean
}

export interface WorkbenchState {
  activeRoute: string
  theme: 'light' | 'dark'
  isNotificationOpen: boolean
  isUserMenuOpen: boolean
  isNewWorkOpen: boolean
  isFilterOpen: boolean
  filterDomain: 'plant' | 'equipment' | 'documents' | 'investigations' | 'pid'
  activeFilters: Record<string, string>
  searchQuery: string
  searchResults: Array<{ id: string; title: string; category: string; route: string; sub?: string }>
  notifications: SystemNotification[]
  auditEvents: AuditEvent[]
  investigations: Investigation[]
  documents: DocumentItem[]
  equipments: EquipmentItem[]
  modelRouteRules: ModelRouteRule[]
  sovereigntyPolicies: SovereigntyPolicy[]
}

const initialNotifications: SystemNotification[] = [
  {
    id: 'n1',
    title: 'P-101 vibration report updated',
    description: 'Vibration spectrum analysis completed for Crude Feed Pump P-101 A.',
    time: '10 min ago',
    read: false,
    route: '/equipment',
    entityId: 'P-101 A/B',
  },
  {
    id: 'n2',
    title: 'CDU-03 P&ID revised',
    description: 'Diagram CDU-03-001 updated to Rev 4 with heat exchanger loop additions.',
    time: '1 hour ago',
    read: false,
    route: '/pid',
  },
  {
    id: 'n3',
    title: 'Investigation #INV-104 requires review',
    description: 'High pressure alarm on crude preheat exchanger E-101 needs engineer sign-off.',
    time: '2 hours ago',
    read: true,
    route: '/investigations',
    entityId: 'INV-104',
  },
]

const initialAuditEvents: AuditEvent[] = [
  {
    id: 'aud-1',
    timestamp: '2026-09-27 18:30:12',
    user: 'N. Engineer',
    action: 'Opened P&ID CDU-03-001',
    category: 'P&ID',
    details: 'Viewed Crude Distillation Unit process schematic in interactive viewer.',
  },
  {
    id: 'aud-2',
    timestamp: '2026-09-27 17:45:00',
    user: 'N. Engineer',
    action: 'Inspected Equipment P-101 A/B',
    category: 'Equipment',
    details: 'Checked operating pressure (18.2 bar) and vibration telemetry.',
  },
  {
    id: 'aud-3',
    timestamp: '2026-09-27 16:15:22',
    user: 'N. Engineer',
    action: 'Updated Sovereignty Settings',
    category: 'Sovereignty',
    details: 'Enforced Local Model Fallback Policy for on-prem compliance.',
  },
]

const initialInvestigations: Investigation[] = [
  {
    id: 'INV-104',
    title: 'E-101 Preheat Tube Pressure Drop Spike',
    description: 'Differential pressure across crude preheat exchanger E-101 exceeded normal operating threshold by 14%.',
    plant: 'MRPL Refinery',
    unit: 'CDU-03',
    area: '100 - Crude Preheat',
    equipmentId: 'E-101',
    priority: 'High',
    status: 'In Review',
    assignedUser: 'N. Engineer',
    createdAt: '2026-09-26 14:00',
    evidenceCount: 5,
  },
  {
    id: 'INV-105',
    title: 'P-101 B Standby Switch Cavitation Check',
    description: 'Acoustic monitoring detected minor cavitation harmonics during automatic pump switchover test.',
    plant: 'MRPL Refinery',
    unit: 'CDU-03',
    area: '100 - Crude Preheat',
    equipmentId: 'P-101 A/B',
    priority: 'Medium',
    status: 'Open',
    assignedUser: 'Process Team Lead',
    createdAt: '2026-09-27 09:30',
    evidenceCount: 3,
  },
]

const initialDocuments: DocumentItem[] = [
  { id: 'doc-1', title: 'CDU-03-001.pdf', type: 'P&ID', unit: 'CDU-03', equipmentTag: 'P-101 A/B', updatedAt: '2026-09-25', size: '4.2 MB', status: 'Approved' },
  { id: 'doc-2', title: 'P-101_A_B_Pump_Datasheet.pdf', type: 'Datasheet', unit: 'CDU-03', equipmentTag: 'P-101 A/B', updatedAt: '2026-09-20', size: '1.8 MB', status: 'Approved' },
  { id: 'doc-3', title: 'E-101_Exchanger_Maintenance_Manual.pdf', type: 'Manual', unit: 'CDU-03', equipmentTag: 'E-101', updatedAt: '2026-09-18', size: '12.5 MB', status: 'Approved' },
  { id: 'doc-4', title: 'Crude_Distillation_Unit_Inspection_Log.pdf', type: 'Inspection', unit: 'CDU-03', updatedAt: '2026-09-22', size: '3.1 MB', status: 'Under Review' },
  { id: 'doc-5', title: 'CDU-03_Process_Flow_Diagram_PFD.pdf', type: 'PFD', unit: 'CDU-03', updatedAt: '2026-09-10', size: '5.6 MB', status: 'Approved' },
]

const initialEquipments: EquipmentItem[] = [
  { id: 'eq-1', tag: 'P-101 A/B', name: 'Crude Feed Pumps', category: 'Pump', unit: 'CDU-03', area: 'Area 100 - Crude Preheat', status: 'In Service', designPress: '25.0 bar', operatingPress: '18.2 bar', temp: '145 °C' },
  { id: 'eq-2', tag: 'E-101', name: 'Crude Preheat Exchanger A', category: 'Exchanger', unit: 'CDU-03', area: 'Area 100 - Crude Preheat', status: 'In Service', designPress: '30.0 bar', operatingPress: '22.0 bar', temp: '180 °C' },
  { id: 'eq-3', tag: 'E-102', name: 'Crude Preheat Exchanger B', category: 'Exchanger', unit: 'CDU-03', area: 'Area 100 - Crude Preheat', status: 'In Service', designPress: '30.0 bar', operatingPress: '21.8 bar', temp: '210 °C' },
  { id: 'eq-4', tag: 'T-101', name: 'Main Atmospheric Crude Column', category: 'Tower', unit: 'CDU-03', area: 'Area 200 - Fractionation', status: 'In Service', designPress: '8.5 bar', operatingPress: '3.2 bar', temp: '365 °C' },
  { id: 'eq-5', tag: 'V-201', name: 'Reflux Accumulator Drum', category: 'Vessel', unit: 'CDU-03', area: 'Area 200 - Fractionation', status: 'In Service', designPress: '10.0 bar', operatingPress: '4.5 bar', temp: '65 °C' },
]

const initialRules: ModelRouteRule[] = [
  { id: 'r1', name: 'P&ID Reasoning & Vision Query', taskType: 'Vision / Schematics', primaryModel: 'Qwen 2.5 VL 72B', fallbackModel: 'Llama 3.2 Vision 11B', latencySLA: '< 800ms', enabled: true },
  { id: 'r2', name: 'Code Generation & Script Automation', taskType: 'Code Analysis', primaryModel: 'DeepSeek Coder V2 16B', fallbackModel: 'Qwen 2.5 Coder 7B', latencySLA: '< 500ms', enabled: true },
  { id: 'r3', name: 'General Engineering Query', taskType: 'LLM Reasoning', primaryModel: 'Llama 3.3 70B Instruct', fallbackModel: 'Mistral Small 24B', latencySLA: '< 1200ms', enabled: true },
]

const initialPolicies: SovereigntyPolicy[] = [
  { id: 'p1', label: 'Air-Gapped Local Inference Only', description: 'Prevent telemetry and model inputs from leaving local premises.', enabled: true },
  { id: 'p2', label: 'Strict Data Residency (On-Premises)', description: 'Restrict storage of engineering documents to local cluster nodes.', enabled: true },
  { id: 'p3', label: 'Audit Trail Signature Verification', description: 'Cryptographically sign all engineering decision events.', enabled: true },
]

const savedTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('hyperion_theme') as 'light' | 'dark' : null) || 'light'

const initialState: WorkbenchState = {
  activeRoute: '/pid',
  theme: savedTheme,
  isNotificationOpen: false,
  isUserMenuOpen: false,
  isNewWorkOpen: false,
  isFilterOpen: false,
  filterDomain: 'plant',
  activeFilters: {},
  searchQuery: '',
  searchResults: [],
  notifications: initialNotifications,
  auditEvents: initialAuditEvents,
  investigations: initialInvestigations,
  documents: initialDocuments,
  equipments: initialEquipments,
  modelRouteRules: initialRules,
  sovereigntyPolicies: initialPolicies,
}

class WorkbenchStore {
  private state: WorkbenchState = { ...initialState }
  private listeners = new Set<() => void>()

  getSnapshot = (): WorkbenchState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setState(updates: Partial<WorkbenchState>): void {
    this.state = { ...this.state, ...updates }
    for (const listener of this.listeners) {
      listener()
    }
  }

  setActiveRoute(route: string): void {
    this.setState({
      activeRoute: route,
      isNotificationOpen: false,
      isUserMenuOpen: false,
      isNewWorkOpen: false,
    })
    this.logAudit('Navigation', `Navigated to ${route}`)
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.setState({ theme })
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hyperion_theme', theme)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }

  toggleTheme(): void {
    const nextTheme = this.state.theme === 'light' ? 'dark' : 'light'
    this.setTheme(nextTheme)
  }

  toggleNotification(): void {
    this.setState({
      isNotificationOpen: !this.state.isNotificationOpen,
      isUserMenuOpen: false,
    })
  }

  toggleUserMenu(): void {
    this.setState({
      isUserMenuOpen: !this.state.isUserMenuOpen,
      isNotificationOpen: false,
    })
  }

  openNewWork(): void {
    this.setState({
      isNewWorkOpen: true,
      isNotificationOpen: false,
      isUserMenuOpen: false,
    })
  }

  closeNewWork(): void {
    this.setState({ isNewWorkOpen: false })
  }

  openFilter(domain: WorkbenchState['filterDomain']): void {
    this.setState({ isFilterOpen: true, filterDomain: domain })
  }

  closeFilter(): void {
    this.setState({ isFilterOpen: false })
  }

  applyFilters(filters: Record<string, string>): void {
    this.setState({ activeFilters: filters, isFilterOpen: false })
    this.logAudit(
      this.state.filterDomain === 'pid' ? 'P&ID' : 'Equipment',
      `Applied filters for ${this.state.filterDomain}`
    )
  }

  resetFilters(): void {
    this.setState({ activeFilters: {}, isFilterOpen: false })
  }

  setSearchQuery(query: string): void {
    const q = query.trim().toLowerCase()
    if (!q) {
      this.setState({ searchQuery: query, searchResults: [] })
      return
    }

    const results: WorkbenchState['searchResults'] = []

    // Search Equipment
    for (const eq of this.state.equipments) {
      if (eq.tag.toLowerCase().includes(q) || eq.name.toLowerCase().includes(q)) {
        results.push({ id: eq.id, title: eq.tag, category: 'Equipment', sub: eq.name, route: '/equipment' })
      }
    }

    // Search Documents
    for (const doc of this.state.documents) {
      if (doc.title.toLowerCase().includes(q) || doc.type.toLowerCase().includes(q)) {
        results.push({ id: doc.id, title: doc.title, category: 'Document', sub: `${doc.type} • ${doc.unit}`, route: '/documents' })
      }
    }

    // Search Investigations
    for (const inv of this.state.investigations) {
      if (inv.id.toLowerCase().includes(q) || inv.title.toLowerCase().includes(q)) {
        results.push({ id: inv.id, title: `${inv.id}: ${inv.title}`, category: 'Investigation', sub: inv.status, route: '/investigations' })
      }
    }

    // Static Unit Matches
    if ('cdu-03'.includes(q) || 'crude distillation unit'.includes(q)) {
      results.push({ id: 'unit-cdu', title: 'Crude Distillation Unit (CDU-03)', category: 'Unit', sub: 'MRPL Refinery', route: '/plant' })
    }

    this.setState({ searchQuery: query, searchResults: results })
  }

  clearSearch(): void {
    this.setState({ searchQuery: '', searchResults: [] })
  }

  markNotificationRead(id: string): void {
    this.setState({
      notifications: this.state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    })
  }

  addInvestigation(data: Omit<Investigation, 'id' | 'createdAt' | 'evidenceCount'>): Investigation {
    const newInv: Investigation = {
      ...data,
      id: `INV-${100 + this.state.investigations.length + 1}`,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      evidenceCount: 1,
    }
    this.setState({
      investigations: [newInv, ...this.state.investigations],
    })
    this.logAudit('Investigation', `Created investigation ${newInv.id}: ${newInv.title}`)
    return newInv
  }

  toggleRule(id: string): void {
    this.setState({
      modelRouteRules: this.state.modelRouteRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r),
    })
    this.logAudit('Model Router', `Toggled routing rule ${id}`)
  }

  togglePolicy(id: string): void {
    this.setState({
      sovereigntyPolicies: this.state.sovereigntyPolicies.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p),
    })
    this.logAudit('Sovereignty', `Toggled sovereignty policy ${id}`)
  }

  logAudit(category: AuditEvent['category'], action: string, details = ''): void {
    const newEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: 'N. Engineer',
      category,
      action,
      details: details || action,
    }
    this.setState({
      auditEvents: [newEvent, ...this.state.auditEvents],
    })
  }
}

export const workbenchStore = new WorkbenchStore()

export function useWorkbenchStore(): WorkbenchState {
  return useSyncExternalStore(workbenchStore.subscribe, workbenchStore.getSnapshot)
}
