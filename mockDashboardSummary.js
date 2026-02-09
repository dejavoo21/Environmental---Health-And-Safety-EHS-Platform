// frontend/src/mocks/mockDashboardSummary.js

export const mockDashboardSummary = {
  incidents: {
    total: 42,
    open: 7,
    last_30_days: 10,
    by_severity: [
      { severity: 'critical', count: 1 },
      { severity: 'high', count: 4 },
      { severity: 'medium', count: 15 },
      { severity: 'low', count: 22 },
    ],
    by_type: [
      { type_id: 1, type_name: 'Injury', count: 12 },
      { type_id: 2, type_name: 'Near Miss', count: 20 },
      { type_id: 3, type_name: 'Property Damage', count: 10 },
    ],
    severity_trend: [
      {
        month: '2024-10',
        counts: { critical: 0, high: 1, medium: 3, low: 2 },
      },
      {
        month: '2024-11',
        counts: { critical: 1, high: 1, medium: 4, low: 3 },
      },
      {
        month: '2024-12',
        counts: { critical: 0, high: 2, medium: 5, low: 4 },
      },
      {
        month: '2025-01',
        counts: { critical: 0, high: 0, medium: 3, low: 5 },
      },
    ],
    recent: [
      {
        id: 'inc-001',
        title: 'Forklift near miss in loading bay',
        site_name: 'Head Office',
        incident_type: 'Near Miss',
        severity: 'medium',
        status: 'open',
        occurred_at: '2025-01-25T09:30:00.000Z',
      },
      {
        id: 'inc-002',
        title: 'Slip on wet floor in hallway',
        site_name: 'Warehouse 1',
        incident_type: 'Injury',
        severity: 'high',
        status: 'under_investigation',
        occurred_at: '2025-01-20T14:10:00.000Z',
      },
      {
        id: 'inc-003',
        title: 'Minor damage to racking',
        site_name: 'Warehouse 1',
        incident_type: 'Property Damage',
        severity: 'low',
        status: 'closed',
        occurred_at: '2025-01-18T11:00:00.000Z',
      },
      {
        id: 'inc-004',
        title: 'PPE not worn in packing area',
        site_name: 'Head Office',
        incident_type: 'Near Miss',
        severity: 'medium',
        status: 'open',
        occurred_at: '2025-01-15T08:45:00.000Z',
      },
      {
        id: 'inc-005',
        title: 'Blocked fire exit discovered',
        site_name: 'Warehouse 2',
        incident_type: 'Near Miss',
        severity: 'high',
        status: 'closed',
        occurred_at: '2025-01-10T16:20:00.000Z',
      },
    ],
  },
  inspections: {
    last_30_days: 8,
    failed_last_30_days: 2,
    recent: [
      {
        id: 'insp-001',
        template_name: 'General Safety Walk',
        site_name: 'Head Office',
        performed_by_name: 'Jane Doe',
        performed_at: '2025-01-26T10:00:00.000Z',
        overall_result: 'pass',
      },
      {
        id: 'insp-002',
        template_name: 'Warehouse Safety Checklist',
        site_name: 'Warehouse 1',
        performed_by_name: 'John Smith',
        performed_at: '2025-01-24T09:15:00.000Z',
        overall_result: 'fail',
      },
      {
        id: 'insp-003',
        template_name: 'Fire Safety Inspection',
        site_name: 'Warehouse 2',
        performed_by_name: 'Jane Doe',
        performed_at: '2025-01-22T13:30:00.000Z',
        overall_result: 'pass',
      },
      {
        id: 'insp-004',
        template_name: 'General Safety Walk',
        site_name: 'Warehouse 1',
        performed_by_name: 'John Smith',
        performed_at: '2025-01-18T08:00:00.000Z',
        overall_result: 'fail',
      },
    ],
  },
};
