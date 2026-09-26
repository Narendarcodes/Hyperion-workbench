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
  { id: 'RPT-2024-002', title: 'Root Cause Analysis', type: 'Investigation', unit: 'High Vibration', equipment: '-', date: '15 Jan 2024', status: 'Completed' },
  { id: 'RPT-2024-003', title: 'Maintenance Recommendation', type: 'Analysis', unit: '-', equipment: '-', date: '12 Jan 2024', status: 'In Review' },
  { id: 'RPT-2024-004', title: 'Inspection Summary', type: 'Compliance', unit: 'Q4 2024', equipment: '-', date: '10 Jan 2024', status: 'Completed' },
  { id: 'RPT-2024-005', title: 'Equipment Health Report', type: 'Analysis', unit: 'P-101 A/B', equipment: '-', date: '05 Jan 2024', status: 'Draft' },
  { id: 'RPT-2024-006', title: 'P&ID Analysis Report', type: 'Analysis', unit: 'CDU-03', equipment: '-', date: '02 Jan 2024', status: 'Completed' },
  { id: 'RPT-2024-007', title: 'Regulatory Compliance Report', type: 'Compliance', unit: 'Safety', equipment: '-', date: '28 Dec 2023', status: 'Completed' },
  { id: 'RPT-2024-008', title: 'Simulation Results Report', type: 'Analysis', unit: 'What-if Scenario 1', equipment: '-', date: '20 Dec 2023', status: 'Rejected' },
  { id: 'RPT-2024-009', title: 'Energy Efficiency Analysis', type: 'Analysis', unit: 'Plant-wide', equipment: '-', date: '15 Dec 2023', status: 'Completed' },
  { id: 'RPT-2024-010', title: 'Safety Assessment Report', type: 'Compliance', unit: 'Site A', equipment: '-', date: '10 Dec 2023', status: 'In Review' },
]

export const FIXTURE_RELATED_ITEMS = [
  { id: 'INV-2024-001', title: 'High vibration investigation', subtitle: 'INV-2024-001', type: 'Investigation' },
  { id: 'P-204', title: 'Equipment details', subtitle: 'P-204', type: 'Equipment' },
  { id: 'DATA-1', title: 'Raw sensor data', subtitle: 'Vibration data (Jan 2024)', type: 'Data' },
  { id: 'MAINT-1', title: 'Work orders and activities', subtitle: 'Maintenance history', type: 'History' },
]
