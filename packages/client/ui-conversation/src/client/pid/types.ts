export type EquipmentStatus = 'In Service' | 'Standby' | 'Maintenance' | 'Offline'

export interface PIDEquipment {
  id: string
  tag: string
  name: string
  type: string
  service: string
  unit: string
  area: string
  pid: string
  status: EquipmentStatus
  description: string
  specs?: Record<string, string>
  vramOrPower?: string
  connectedLines?: string[]
  documents?: string[]
}

export interface PIDLine {
  id: string
  lineNo: string
  service: string
  from: string
  to: string
  size: string
  spec: string
}

export interface PIDDocument {
  id: string
  fileName: string
  title: string
  type: 'P&ID' | 'Datasheet' | 'Maintenance' | 'Procedure' | 'Inspection' | 'Design Spec' | 'Control Philosophy' | 'Reference'
  date: string
  fileSize: string
  tagRef?: string
}

export interface PIDAreaNode {
  id: string
  name: string
  code: string
  categories: Array<{
    id: string
    name: string
    items: string[] // equipment IDs
  }>
}

export interface PIDLayerState {
  equipment: boolean
  lines: boolean
  loops: boolean
  annotations: boolean
}
