export interface ReportSummary {
  id: string
  title: string
  type: string
  unit: string
  equipment: string
  date: string
  status: 'Completed' | 'In Review' | 'Draft' | 'Rejected'
}

export const FIXTURE_REPORTS: ReportSummary[] = [
  { id: 'RPT-2024-001', title: 'Vibration Analysis Report', type: 'Analysis', unit: 'CDU-03', equipment: 'P-204', date: '18 Jan 2024', status: 'Completed' },
  { id: 'RPT-2024-002', title: 'Root Cause Analysis', type: 'RCA', unit: 'CDU-03', equipment: 'P-204', date: '16 Jan 2024', status: 'Completed' },
  { id: 'RPT-2024-003', title: 'Maintenance Recommendation', type: 'Recommendation', unit: 'CDU-03', equipment: 'P-204', date: '14 Jan 2024', status: 'Completed' },
  { id: 'RPT-2024-004', title: 'Inspection Summary Q4 2024', type: 'Inspection', unit: 'CDU-03', equipment: '-', date: '12 Jan 2024', status: 'Completed' },
  { id: 'RPT-2024-005', title: 'Equipment Health Report', type: 'Health', unit: 'CDU-03', equipment: 'P-101 A/B', date: '08 Jan 2024', status: 'Completed' },
  { id: 'RPT-2024-006', title: 'P&ID Analysis Report CDU-03', type: 'P&ID', unit: 'CDU-03', equipment: '-', date: '05 Jan 2024', status: 'Completed' },
  { id: 'RPT-2024-007', title: 'Regulatory Compliance Report', type: 'Compliance', unit: 'All Units', equipment: '-', date: '02 Jan 2024', status: 'Completed' },
  { id: 'RPT-2024-008', title: 'Simulation Results Report What-if Scenario 1', type: 'Simulation', unit: 'CDU-03', equipment: '-', date: '28 Dec 2023', status: 'In Review' },
  { id: 'RPT-2024-009', title: 'Energy Efficiency Analysis', type: 'Analysis', unit: 'HCU-01', equipment: '-', date: '25 Dec 2023', status: 'Completed' },
  { id: 'RPT-2024-010', title: 'Safety Assessment Report', type: 'Safety', unit: 'VDU-01', equipment: '-', date: '20 Dec 2023', status: 'Completed' },
]

export const FIXTURE_RELATED_ITEMS = [
  { id: 'INV-2024-001', title: 'High vibration investigation', subtitle: 'INV-2024-001', type: 'Investigation' },
  { id: 'P-204', title: 'Equipment details', subtitle: 'P-204', type: 'Equipment' },
  { id: 'DATA-1', title: 'Vibration data (Jan 2024)', subtitle: 'Raw sensor data', type: 'Data' },
  { id: 'MAINT-1', title: 'Maintenance history', subtitle: 'Work orders and activities', type: 'Maintenance' },
]
