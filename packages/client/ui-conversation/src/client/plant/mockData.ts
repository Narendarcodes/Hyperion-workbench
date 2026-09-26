/**
 * Seed presentation data for the MRPL Refinery Plant Overview.
 * Isolated from backend persistence per Hyperion Screen 2 specifications.
 * @module @deepseek-ai/dsh-client-ui-conversation/client/plant/mockData
 */

import type { PlantOverviewData } from './types.ts'

export const DEFAULT_PLANT_OVERVIEW_DATA: PlantOverviewData = {
  name: 'MRPL Refinery',
  subtitle: 'Plant-wide engineering context',
  breadcrumb: ['Plant', 'Overview'],
  metrics: [
    {
      id: 'units',
      value: '12',
      label: 'Process Units',
      description: 'Across the refinery',
      tone: 'blue',
    },
    {
      id: 'equipment',
      value: '248',
      label: 'Equipment',
      description: 'Indexed assets',
      tone: 'green',
    },
    {
      id: 'documents',
      value: '1,284',
      label: 'Documents',
      description: 'Engineering records',
      tone: 'purple',
    },
    {
      id: 'investigations',
      value: '7',
      label: 'Active Investigations',
      description: 'Ongoing engineering work',
      tone: 'amber',
    },
  ],
  selectedUnit: {
    id: 'cdu',
    code: 'CDU',
    name: 'Crude Distillation Unit (CDU)',
    subtitle: 'Primary crude processing unit',
    status: 'active',
    imageUrl: '/refinery.png',
    activeTab: 'overview',
    equipmentCount: 42,
    documentCount: 186,
    pidCount: 14,
    investigationCount: 6,
  },
  processUnits: [
    {
      id: 'cdu',
      code: 'CDU',
      name: 'CDU',
      description: 'Crude Distillation',
      status: 'active',
      equipmentCount: 42,
      documentCount: 186,
      tone: 'blue',
    },
    {
      id: 'vdu',
      code: 'VDU',
      name: 'VDU',
      description: 'Vacuum Distillation',
      status: 'active',
      equipmentCount: 28,
      documentCount: 124,
      tone: 'cyan',
    },
    {
      id: 'hcu',
      code: 'HCU',
      name: 'HCU',
      description: 'Hydrocracking',
      status: 'active',
      equipmentCount: 36,
      documentCount: 98,
      tone: 'green',
    },
    {
      id: 'hdt',
      code: 'HDT',
      name: 'HDT',
      description: 'Hydrotreating',
      status: 'active',
      equipmentCount: 26,
      documentCount: 74,
      tone: 'purple',
    },
  ],
  recentActivity: [
    {
      id: 'act-1',
      title: 'P-204 Equipment Investigation',
      unit: 'CDU-03',
      category: 'Equipment',
      timestamp: '2 hours ago',
      iconKind: 'investigation',
      tone: 'blue',
    },
    {
      id: 'act-2',
      title: 'P&ID Analysis — CDU-03',
      unit: 'CDU',
      category: 'P&ID',
      timestamp: 'Yesterday',
      iconKind: 'pid',
      tone: 'blue',
    },
    {
      id: 'act-3',
      title: 'Safety Permit Review',
      unit: 'HCU',
      category: 'Documents',
      timestamp: '2 days ago',
      iconKind: 'safety',
      tone: 'amber',
    },
  ],
}
