export interface ReportSummary {
  readonly id: string
  readonly title: string
  readonly type: string
  readonly unitEquipment: string
  readonly date: string
  readonly status: string
  readonly pages: number
}

export interface SummaryCardData {
  readonly id: string
  readonly icon: string
  readonly label: string
  readonly value: number
}

export const FIXTURE_SUMMARY_CARDS: readonly SummaryCardData[] = [
  { id: '1', icon: 'Document', label: 'Total Reports', value: 98 },
  { id: '2', icon: 'Sparkle', label: 'AI Generated', value: 56 },
  { id: '3', icon: 'Document2', label: 'Manual Reports', value: 42 },
  { id: '4', icon: 'Clock', label: 'Pending Review', value: 6 },
  { id: '5', icon: 'Users', label: 'Shared Reports', value: 18 },
  { id: '6', icon: 'Analytics', label: 'This Month', value: 14 },
]

export const FIXTURE_REPORTS: readonly ReportSummary[] = [
  {
    id: 'RPT-2024-001',
    title: 'Analysis', // Put this in title column to match the mock
    type: 'CDU-03 P-204',
    unitEquipment: '18 Jan 2024',
    date: 'Completed',
    status: '', // empty to match the 4-column data
    pages: 12,
  },
  {
    id: 'RPT-2024-002',
    title: 'RCA',
    type: 'CDU-03 P-204',
    unitEquipment: '16 Jan 2024',
    date: 'Completed',
    status: '',
    pages: 8,
  },
  {
    id: 'RPT-2024-003',
    title: 'Recommendation',
    type: 'CDU-03 P-204',
    unitEquipment: '14 Jan 2024',
    date: 'Completed',
    status: '',
    pages: 5,
  },
]
