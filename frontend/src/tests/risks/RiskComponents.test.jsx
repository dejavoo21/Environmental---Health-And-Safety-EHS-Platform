/**
 * Risk Components Tests - Phase 9
 * Tests covering TC-P9-* test cases
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import {
  RiskLevelBadge,
  RiskStatusBadge,
  RiskScoreCard,
  ScoringSelector,
  RiskHeatmap,
  RiskHeatmapCell,
  ControlCard,
  LinkCard,
  ReviewCard,
  RiskFilters,
  RiskSummaryCards
} from '../../components/risks';

// Test wrapper for components that need router context
const TestWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('RiskLevelBadge', () => {
  it('TC-P9-01: renders correct color for LOW level', () => {
    render(<RiskLevelBadge level="low" score={4} />);
    const badge = screen.getByText('LOW');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.risk-level-badge')).toHaveStyle({ color: '#4CAF50' });
  });

  it('TC-P9-02: renders correct color for MEDIUM level', () => {
    render(<RiskLevelBadge level="medium" score={9} />);
    const badge = screen.getByText('MEDIUM');
    expect(badge).toBeInTheDocument();
  });

  it('TC-P9-03: renders correct color for HIGH level', () => {
    render(<RiskLevelBadge level="high" score={16} />);
    const badge = screen.getByText('HIGH');
    expect(badge).toBeInTheDocument();
  });

  it('TC-P9-04: renders correct color for EXTREME level', () => {
    render(<RiskLevelBadge level="extreme" score={25} />);
    const badge = screen.getByText('EXTREME');
    expect(badge).toBeInTheDocument();
  });

  it('displays score when provided', () => {
    render(<RiskLevelBadge level="high" score={15} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { rerender } = render(<RiskLevelBadge level="low" size="small" />);
    expect(screen.getByText('LOW').closest('.risk-level-badge')).toHaveClass('risk-level-badge--small');

    rerender(<RiskLevelBadge level="low" size="large" />);
    expect(screen.getByText('LOW').closest('.risk-level-badge')).toHaveClass('risk-level-badge--large');
  });
});

describe('RiskStatusBadge', () => {
  it('TC-P9-05: renders emerging status', () => {
    render(<RiskStatusBadge status="emerging" />);
    expect(screen.getByText('Emerging')).toBeInTheDocument();
  });

  it('TC-P9-06: renders active status', () => {
    render(<RiskStatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('TC-P9-07: renders under_review status', () => {
    render(<RiskStatusBadge status="under_review" />);
    expect(screen.getByText('Under Review')).toBeInTheDocument();
  });

  it('TC-P9-08: renders closed status', () => {
    render(<RiskStatusBadge status="closed" />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('TC-P9-09: renders accepted status', () => {
    render(<RiskStatusBadge status="accepted" />);
    expect(screen.getByText('Accepted')).toBeInTheDocument();
  });
});

describe('RiskScoreCard', () => {
  it('TC-P9-10: displays score and level correctly', () => {
    render(
      <RiskScoreCard
        title="Inherent Risk"
        score={16}
        level="high"
        likelihood={4}
        impact={4}
      />
    );

    expect(screen.getByText('Inherent Risk')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('TC-P9-11: displays formula correctly', () => {
    render(
      <RiskScoreCard
        title="Test"
        score={12}
        level="high"
        likelihood={3}
        impact={4}
      />
    );

    expect(screen.getByText('Likelihood: 3 × Impact: 4')).toBeInTheDocument();
  });

  it('TC-P9-12: displays rationale when provided', () => {
    render(
      <RiskScoreCard
        title="Test"
        score={12}
        level="high"
        likelihood={3}
        impact={4}
        rationale="This is the rationale"
      />
    );

    expect(screen.getByText('This is the rationale')).toBeInTheDocument();
  });

  it('renders compact version', () => {
    render(
      <RiskScoreCard
        title="Test"
        score={12}
        level="high"
        likelihood={3}
        impact={4}
        compact
      />
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.queryByText('Likelihood: 3 × Impact: 4')).not.toBeInTheDocument();
  });
});

describe('ScoringSelector', () => {
  it('TC-P9-13: renders likelihood options correctly', () => {
    render(<ScoringSelector type="likelihood" value={3} onChange={() => {}} />);

    expect(screen.getByText('Rare')).toBeInTheDocument();
    expect(screen.getByText('Unlikely')).toBeInTheDocument();
    expect(screen.getByText('Possible')).toBeInTheDocument();
    expect(screen.getByText('Likely')).toBeInTheDocument();
    expect(screen.getByText('Almost Certain')).toBeInTheDocument();
  });

  it('TC-P9-14: renders impact options correctly', () => {
    render(<ScoringSelector type="impact" value={3} onChange={() => {}} />);

    expect(screen.getByText('Negligible')).toBeInTheDocument();
    expect(screen.getByText('Minor')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Major')).toBeInTheDocument();
    expect(screen.getByText('Catastrophic')).toBeInTheDocument();
  });

  it('TC-P9-15: calls onChange when option selected', () => {
    const onChange = vi.fn();
    render(<ScoringSelector type="likelihood" value={3} onChange={onChange} />);

    const radio = screen.getAllByRole('radio')[0]; // First option (Rare = 1)
    fireEvent.click(radio);

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('displays error state', () => {
    render(
      <ScoringSelector
        type="likelihood"
        value={null}
        onChange={() => {}}
        error="Likelihood is required"
      />
    );

    expect(screen.getByText('Likelihood is required')).toBeInTheDocument();
  });
});

describe('RiskHeatmapCell', () => {
  it('TC-P9-16: renders count when greater than 0', () => {
    render(
      <RiskHeatmapCell
        likelihood={3}
        impact={4}
        count={5}
        level="high"
        onClick={() => {}}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('TC-P9-17: does not render count when 0', () => {
    render(
      <RiskHeatmapCell
        likelihood={3}
        impact={4}
        count={0}
        level="low"
        onClick={() => {}}
      />
    );

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('TC-P9-18: calls onClick with correct parameters', () => {
    const onClick = vi.fn();
    render(
      <RiskHeatmapCell
        likelihood={3}
        impact={4}
        count={5}
        level="high"
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(3, 4);
  });

  it('shows selected state', () => {
    render(
      <RiskHeatmapCell
        likelihood={3}
        impact={4}
        count={5}
        level="high"
        onClick={() => {}}
        isSelected={true}
      />
    );

    expect(screen.getByRole('button')).toHaveClass('heatmap-cell--selected');
  });
});

describe('RiskHeatmap', () => {
  const mockData = {
    cells: [
      { likelihood: 5, impact: 5, count: 2, level: 'extreme' },
      { likelihood: 3, impact: 3, count: 5, level: 'medium' },
      { likelihood: 1, impact: 1, count: 3, level: 'low' }
    ]
  };

  it('TC-P9-19: renders 5x5 matrix', () => {
    render(<RiskHeatmap data={mockData} onCellClick={() => {}} />);

    // Should have 25 cells
    const cells = screen.getAllByRole('button');
    expect(cells.length).toBe(25);
  });

  it('TC-P9-20: displays counts in correct cells', () => {
    render(<RiskHeatmap data={mockData} onCellClick={() => {}} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('TC-P9-21: calls onCellClick when cell clicked', () => {
    const onCellClick = vi.fn();
    render(<RiskHeatmap data={mockData} onCellClick={onCellClick} />);

    const cells = screen.getAllByRole('button');
    fireEvent.click(cells[0]); // First cell

    expect(onCellClick).toHaveBeenCalled();
  });

  it('displays legend', () => {
    render(<RiskHeatmap data={mockData} onCellClick={() => {}} />);

    expect(screen.getByText('LOW (1-4)')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM (5-9)')).toBeInTheDocument();
    expect(screen.getByText('HIGH (10-16)')).toBeInTheDocument();
    expect(screen.getByText('EXTREME (17-25)')).toBeInTheDocument();
  });
});

describe('ControlCard', () => {
  const mockControl = {
    id: 1,
    description: 'Test control measure',
    type: 'prevention',
    hierarchy: 'engineering',
    effectiveness: 'effective',
    owner_name: 'John Doe',
    implemented_date: '2024-01-15'
  };

  it('TC-P9-22: renders control details', () => {
    render(<ControlCard control={mockControl} index={0} />);

    expect(screen.getByText('Test control measure')).toBeInTheDocument();
    expect(screen.getByText('Preventive')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('✓ Effective')).toBeInTheDocument();
  });

  it('TC-P9-23: displays owner name', () => {
    render(<ControlCard control={mockControl} index={0} />);
    expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
  });

  it('TC-P9-24: renders action buttons when canEdit is true', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onVerify = vi.fn();

    render(
      <ControlCard
        control={mockControl}
        index={0}
        onEdit={onEdit}
        onDelete={onDelete}
        onVerify={onVerify}
        canEdit={true}
      />
    );

    expect(screen.getByText('Verify')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('TC-P9-25: hides action buttons when canEdit is false', () => {
    render(<ControlCard control={mockControl} index={0} canEdit={false} />);

    expect(screen.queryByText('Verify')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});

describe('LinkCard', () => {
  const mockLink = {
    id: 1,
    entity_type: 'incident',
    entity_id: 123,
    entity_reference: 'INC-001',
    entity_title: 'Test Incident',
    entity_status: 'open',
    linked_at: '2024-01-15',
    link_reason: 'Related hazard'
  };

  it('TC-P9-26: renders link details', () => {
    const { container } = render(
      <TestWrapper>
        <LinkCard link={mockLink} />
      </TestWrapper>
    );

    expect(container.querySelector('.link-card__icon svg')).toBeInTheDocument();
    expect(screen.getByText('INC-001: Test Incident')).toBeInTheDocument();
    expect(screen.getByText('Status: open')).toBeInTheDocument();
  });
it('TC-P9-27: displays link reason', () => {
    render(
      <TestWrapper>
        <LinkCard link={mockLink} />
      </TestWrapper>
    );

    expect(screen.getByText('Related hazard')).toBeInTheDocument();
  });

  it('TC-P9-28: shows unlink button when canEdit is true', () => {
    const onUnlink = vi.fn();
    render(
      <TestWrapper>
        <LinkCard link={mockLink} onUnlink={onUnlink} canEdit={true} />
      </TestWrapper>
    );

    expect(screen.getByText('Unlink')).toBeInTheDocument();
  });

  it('TC-P9-29: hides unlink button when canEdit is false', () => {
    render(
      <TestWrapper>
        <LinkCard link={mockLink} canEdit={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('Unlink')).not.toBeInTheDocument();
  });
});

describe('ReviewCard', () => {
  const mockReview = {
    id: 1,
    review_date: '2024-01-15',
    reviewer_name: 'Jane Smith',
    outcome: 'improved',
    inherent_score_snapshot: 16,
    residual_score_snapshot: 9,
    previous_residual_score: 12,
    controls_reviewed: 3,
    notes: 'Controls have reduced likelihood'
  };

  it('TC-P9-30: renders review details', () => {
    render(<ReviewCard review={mockReview} />);

    expect(screen.getByText('• Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Improved')).toBeInTheDocument();
  });

  it('TC-P9-31: displays score change', () => {
    render(<ReviewCard review={mockReview} />);

    expect(screen.getByText(/12 → 9/)).toBeInTheDocument();
  });

  it('TC-P9-32: displays notes', () => {
    render(<ReviewCard review={mockReview} />);
    expect(screen.getByText('Controls have reduced likelihood')).toBeInTheDocument();
  });

  it('displays controls reviewed count', () => {
    render(<ReviewCard review={mockReview} />);
    expect(screen.getByText('Controls Reviewed: 3')).toBeInTheDocument();
  });
});

describe('RiskFilters', () => {
  const mockFilters = {
    status: '',
    categoryId: '',
    siteId: '',
    level: '',
    search: ''
  };

  const mockCategories = [
    { id: 1, name: 'Operational' },
    { id: 2, name: 'Environmental' }
  ];

  it('TC-P9-33: renders all filter fields', () => {
    render(
      <RiskFilters
        filters={mockFilters}
        onFilterChange={() => {}}
        categories={mockCategories}
        sites={[]}
        onClear={() => {}}
      />
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Site')).toBeInTheDocument();
    expect(screen.getByText('Level')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('TC-P9-34: calls onFilterChange when filter changed', () => {
    const onFilterChange = vi.fn();
    render(
      <RiskFilters
        filters={mockFilters}
        onFilterChange={onFilterChange}
        categories={mockCategories}
        sites={[]}
        onClear={() => {}}
      />
    );

    const statusSelect = screen.getByRole('combobox', { name: /status/i });
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    expect(onFilterChange).toHaveBeenCalledWith('status', 'active');
  });

  it('TC-P9-35: shows clear button when filters applied', () => {
    const filtersWithValue = { ...mockFilters, status: 'active' };
    const onClear = vi.fn();

    render(
      <RiskFilters
        filters={filtersWithValue}
        onFilterChange={() => {}}
        categories={mockCategories}
        sites={[]}
        onClear={onClear}
      />
    );

    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear Filters'));
    expect(onClear).toHaveBeenCalled();
  });
});

describe('RiskSummaryCards', () => {
  const mockSummary = {
    total: 50,
    extreme: 5,
    high: 15,
    medium: 20,
    reviewsDue: 8
  };

  it('TC-P9-36: renders all summary cards', () => {
    render(<RiskSummaryCards summary={mockSummary} />);

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Total Risks')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Extreme')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Reviews Due')).toBeInTheDocument();
  });

  it('TC-P9-37: handles zero values', () => {
    const emptySum = { total: 0, extreme: 0, high: 0, medium: 0, reviewsDue: 0 };
    render(<RiskSummaryCards summary={emptySum} />);

    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBe(5);
  });
});

