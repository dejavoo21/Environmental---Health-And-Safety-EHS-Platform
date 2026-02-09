import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RiskWidget, { IncidentTypesWidget } from '../components/analytics/RiskWidget';

describe('RiskWidget', () => {
  const mockRiskData = [
    {
      site_id: 'site-1',
      site_name: 'Warehouse A',
      risk_score: 52,
      risk_category: 'critical',
      trend: 'up',
      trend_change: 8
    },
    {
      site_id: 'site-2',
      site_name: 'Factory B',
      risk_score: 38,
      risk_category: 'high',
      trend: 'down',
      trend_change: -5
    },
    {
      site_id: 'site-3',
      site_name: 'Office C',
      risk_score: 22,
      risk_category: 'medium',
      trend: null,
      trend_change: 0
    },
    {
      site_id: 'site-4',
      site_name: 'Distribution Center',
      risk_score: 8,
      risk_category: 'low',
      trend: 'down',
      trend_change: -2
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders widget title', () => {
      render(<RiskWidget sites={mockRiskData} />);

      expect(screen.getByText('Top 5 High-Risk Sites')).toBeInTheDocument();
    });

    it('renders custom title when provided', () => {
      render(<RiskWidget sites={mockRiskData} title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('renders all risk site items', () => {
      render(<RiskWidget sites={mockRiskData} />);

      expect(screen.getByText('Warehouse A')).toBeInTheDocument();
      expect(screen.getByText('Factory B')).toBeInTheDocument();
      expect(screen.getByText('Office C')).toBeInTheDocument();
      expect(screen.getByText('Distribution Center')).toBeInTheDocument();
    });

    it('displays risk score values', () => {
      render(<RiskWidget sites={mockRiskData} />);

      expect(screen.getByText('52')).toBeInTheDocument();
      expect(screen.getByText('38')).toBeInTheDocument();
      expect(screen.getByText('22')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  describe('Risk Categories', () => {
    it('shows CRITICAL category badge', () => {
      render(<RiskWidget sites={mockRiskData} />);

      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });

    it('shows HIGH category badge', () => {
      render(<RiskWidget sites={mockRiskData} />);

      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('shows MEDIUM category badge', () => {
      render(<RiskWidget sites={mockRiskData} />);

      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('shows LOW category badge', () => {
      render(<RiskWidget sites={mockRiskData} />);

      expect(screen.getByText('LOW')).toBeInTheDocument();
    });
  });

  describe('Trend Indicators', () => {
    it('shows up trend indicator', () => {
      render(<RiskWidget sites={mockRiskData} />);

      // Warehouse A has trend: 'up'
      // The arrow may have text after it like "▲ 8"
      const upArrows = document.querySelectorAll('.trend-up-bad');
      expect(upArrows.length).toBeGreaterThan(0);
    });

    it('shows down trend indicator', () => {
      render(<RiskWidget sites={mockRiskData} />);

      // Factory B and Distribution Center have trend: 'down'
      const downArrows = document.querySelectorAll('.trend-down-good');
      expect(downArrows.length).toBeGreaterThan(0);
    });
  });

  describe('Interactions', () => {
    it('calls onSiteClick when site is clicked', () => {
      const onSiteClick = vi.fn();
      render(<RiskWidget sites={mockRiskData} onSiteClick={onSiteClick} />);

      const siteRow = screen.getByText('Warehouse A').closest('.risk-site-row');
      fireEvent.click(siteRow);

      expect(onSiteClick).toHaveBeenCalledWith('site-1', mockRiskData[0]);
    });

    it('calls onSiteClick on keyboard Enter', () => {
      const onSiteClick = vi.fn();
      render(<RiskWidget sites={mockRiskData} onSiteClick={onSiteClick} />);

      const siteRow = screen.getByText('Factory B').closest('.risk-site-row');
      fireEvent.keyDown(siteRow, { key: 'Enter' });

      expect(onSiteClick).toHaveBeenCalledWith('site-2', mockRiskData[1]);
    });

    it('has clickable class when onSiteClick provided', () => {
      render(<RiskWidget sites={mockRiskData} onSiteClick={() => {}} />);

      const siteRow = screen.getByText('Warehouse A').closest('.risk-site-row');
      expect(siteRow).toHaveClass('clickable');
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when loading', () => {
      render(<RiskWidget sites={mockRiskData} loading />);

      const skeletonRows = document.querySelectorAll('.risk-site-row.skeleton');
      expect(skeletonRows.length).toBe(5);
    });

    it('does not render data while loading', () => {
      render(<RiskWidget sites={mockRiskData} loading />);

      expect(screen.queryByText('Warehouse A')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no data', () => {
      render(<RiskWidget sites={[]} />);

      expect(screen.getByText('No risk data available')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper list role', () => {
      render(<RiskWidget sites={mockRiskData} />);

      const list = document.querySelector('.risk-widget-body');
      expect(list).toHaveAttribute('role', 'list');
    });

    it('items have listitem role when not clickable', () => {
      render(<RiskWidget sites={mockRiskData} />);

      const items = document.querySelectorAll('.risk-site-row');
      items.forEach(item => {
        expect(item).toHaveAttribute('role', 'listitem');
      });
    });

    it('items have button role when clickable', () => {
      render(<RiskWidget sites={mockRiskData} onSiteClick={() => {}} />);

      const items = document.querySelectorAll('.risk-site-row');
      items.forEach(item => {
        expect(item).toHaveAttribute('role', 'button');
      });
    });

    it('site items are focusable when clickable', () => {
      render(<RiskWidget sites={mockRiskData} onSiteClick={() => {}} />);

      const siteRow = screen.getByText('Warehouse A').closest('.risk-site-row');
      expect(siteRow).toHaveAttribute('tabIndex', '0');
    });
  });
});

describe('IncidentTypesWidget', () => {
  const mockIncidentTypes = [
    { typeId: 'type-1', typeName: 'Slip/Trip/Fall', incidentCount: 25, percentage: 43 },
    { typeId: 'type-2', typeName: 'Chemical Spill', incidentCount: 15, percentage: 26 },
    { typeId: 'type-3', typeName: 'Equipment Failure', incidentCount: 10, percentage: 17 },
    { typeId: 'type-4', typeName: 'Fire Hazard', incidentCount: 5, percentage: 9 },
    { typeId: 'type-5', typeName: 'Other', incidentCount: 3, percentage: 5 }
  ];

  describe('Rendering', () => {
    it('renders widget title', () => {
      render(<IncidentTypesWidget data={mockIncidentTypes} />);

      expect(screen.getByText('Top Incident Types')).toBeInTheDocument();
    });

    it('renders all incident types', () => {
      render(<IncidentTypesWidget data={mockIncidentTypes} />);

      expect(screen.getByText('Slip/Trip/Fall')).toBeInTheDocument();
      expect(screen.getByText('Chemical Spill')).toBeInTheDocument();
      expect(screen.getByText('Equipment Failure')).toBeInTheDocument();
    });

    it('shows incident counts', () => {
      render(<IncidentTypesWidget data={mockIncidentTypes} />);

      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('shows percentages', () => {
      render(<IncidentTypesWidget data={mockIncidentTypes} />);

      expect(screen.getByText('43%')).toBeInTheDocument();
      expect(screen.getByText('26%')).toBeInTheDocument();
    });

    it('limits display to 5 items by default', () => {
      const manyTypes = [
        ...mockIncidentTypes,
        { typeId: 'type-6', typeName: 'Extra Type', incidentCount: 1, percentage: 1 }
      ];
      render(<IncidentTypesWidget data={manyTypes} />);

      expect(screen.getByText('Slip/Trip/Fall')).toBeInTheDocument();
      expect(screen.queryByText('Extra Type')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when loading', () => {
      render(<IncidentTypesWidget data={mockIncidentTypes} loading />);

      const skeletonRows = document.querySelectorAll('.type-row.skeleton');
      expect(skeletonRows.length).toBe(5);
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no data', () => {
      render(<IncidentTypesWidget data={[]} />);

      expect(screen.getByText('No incident type data available')).toBeInTheDocument();
    });
  });
});
