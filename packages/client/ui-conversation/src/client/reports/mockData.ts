export interface ReportSummary {
  readonly id: string
  readonly title: string
  readonly subtitle?: string
  readonly type: string
  readonly unit: string
  readonly equipment: string
  readonly date: string
  readonly status: string
  readonly pages: number
  readonly iconColor: string
}

export interface SummaryCardData {
  readonly id: string
  readonly icon: string
  readonly label: string
  readonly value: number
  readonly iconColor: string
}

export interface RelatedItem {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly type: string
}

export const FIXTURE_SUMMARY_CARDS: readonly SummaryCardData[] = [
  {
    id: '1',
    icon: 'Document',
    label: 'Total Reports',
    value: 98,
    iconColor: 'blue',
  },
  {
    id: '2',
    icon: 'Sparkle',
    label: 'AI Generated',
    value: 56,
    iconColor: 'purple',
  },
  {
    id: '3',
    icon: 'Document2',
    label: 'Manual Reports',
    value: 42,
    iconColor: 'blue',
  },
  {
    id: '4',
    icon: 'Clock',
    label: 'Pending Review',
    value: 6,
    iconColor: 'red',
  },
  {
    id: '5',
    icon: 'Users',
    label: 'Shared Reports',
    value: 18,
    iconColor: 'blue',
  },
  {
    id: '6',
    icon: 'Analytics',
    label: 'This Month',
    value: 14,
    iconColor: 'green',
  },
]

export const FIXTURE_REPORTS: readonly ReportSummary[] = [
  {
    id: 'RPT-2024-001',
    title: 'Vibration Analysis Report',
    subtitle: 'P-204',
    type: 'Analysis',
    unit: 'CDU-03',
    equipment: 'P-204',
    date: '18 Jan 2024',
    status: 'Completed',
    pages: 12,
    iconColor: 'purple',
  },
  {
    id: 'RPT-2024-002',
    title: 'Root Cause Analysis',
    subtitle: 'High Vibration',
    type: 'RCA',
    unit: 'CDU-03',
    equipment: 'P-204',
    date: '16 Jan 2024',
    status: 'Completed',
    pages: 8,
    iconColor: 'orange',
  },
  {
    id: 'RPT-2024-003',
    title: 'Maintenance',
    subtitle: 'Recommendation',
    type: 'Recommendation',
    unit: 'CDU-03',
    equipment: 'P-204',
    date: '14 Jan 2024',
    status: 'Completed',
    pages: 5,
    iconColor: 'green',
  },
  {
    id: 'RPT-2024-004',
    title: 'Inspection Summary',
    subtitle: 'Q4 2024',
    type: 'Inspection',
    unit: 'CDU-03',
    equipment: '',
    date: '12 Jan 2024',
    status: 'Completed',
    pages: 24,
    iconColor: 'orange',
  },
  {
    id: 'RPT-2024-005',
    title: 'Equipment Health Report',
    subtitle: 'P-101 A/B',
    type: 'Health',
    unit: 'CDU-03',
    equipment: 'P-101 A/B',
    date: '08 Jan 2024',
    status: 'Completed',
    pages: 16,
    iconColor: 'blue',
  },
  {
    id: 'RPT-2024-006',
    title: 'P&ID Analysis Report',
    subtitle: 'CDU-03',
    type: 'P&ID',
    unit: 'CDU-03',
    equipment: '',
    date: '05 Jan 2024',
    status: 'Completed',
    pages: 42,
    iconColor: 'purple',
  },
  {
    id: 'RPT-2024-007',
    title: 'Regulatory Compliance',
    subtitle: 'Report',
    type: 'Compliance',
    unit: 'All Units',
    equipment: '',
    date: '02 Jan 2024',
    status: 'Completed',
    pages: 56,
    iconColor: 'green',
  },
  {
    id: 'RPT-2024-008',
    title: 'Simulation Results Report',
    subtitle: 'What-if Scenario 1',
    type: 'Simulation',
    unit: 'CDU-03',
    equipment: '',
    date: '28 Dec 2023',
    status: 'In Review',
    pages: 18,
    iconColor: 'blue',
  },
  {
    id: 'RPT-2024-009',
    title: 'Energy Efficiency Analysis',
    subtitle: '',
    type: 'Analysis',
    unit: 'HCU-01',
    equipment: '',
    date: '25 Dec 2023',
    status: 'Completed',
    pages: 22,
    iconColor: 'orange',
  },
  {
    id: 'RPT-2024-010',
    title: 'Safety Assessment Report',
    subtitle: '',
    type: 'Safety',
    unit: 'VDU-01',
    equipment: '',
    date: '20 Dec 2023',
    status: 'Completed',
    pages: 34,
    iconColor: 'orange',
  },
]

export const FIXTURE_RELATED_ITEMS: readonly RelatedItem[] = [
  {
    id: 'INV-2024-001',
    title: 'High vibration investigation',
    subtitle: 'INV-2024-001',
    type: 'Investigation',
  },
  {
    id: 'P-204',
    title: 'Equipment details',
    subtitle: 'P-204',
    type: 'Equipment',
  },
  {
    id: 'DATA-1',
    title: 'Vibration data (Jan 2024)',
    subtitle: 'Raw sensor data',
    type: 'Data',
  },
  {
    id: 'MAINT-1',
    title: 'Maintenance history',
    subtitle: 'Work orders and activities',
    type: 'Maintenance',
  },
]
