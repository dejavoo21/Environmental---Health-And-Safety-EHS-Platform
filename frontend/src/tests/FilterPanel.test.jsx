import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FilterPanel from '../components/analytics/FilterPanel';

// Mock API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn()
  }
}));

import api from '../api/client';

describe('FilterPanel', () => {
  const mockSites = [
    { id: 'site-1', name: 'Warehouse A' },
    { id: 'site-2', name: 'Factory B' },
    { id: 'site-3', name: 'Office C' }
  ];

  const mockIncidentTypes = [
    { id: 'type-1', name: 'Slip/Trip/Fall' },
    { id: 'type-2', name: 'Chemical Spill' },
    { id: 'type-3', name: 'Equipment Failure' }
  ];

  const defaultProps = {
    filters: {},
    onChange: vi.fn(),
    onClear: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/sites') {
        return Promise.resolve({ data: mockSites });
      }
      if (url === '/incident-types') {
        return Promise.resolve({ data: mockIncidentTypes });
      }
      return Promise.resolve({ data: [] });
    });
  });

  describe('Rendering', () => {
    it('renders filter panel header with "Filters" text', async () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('renders date range dropdown', async () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByText('Date Range')).toBeInTheDocument();
    });

    it('renders sites filter section', async () => {
      render(<FilterPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Sites')).toBeInTheDocument();
      });
    });

    it('renders incident types filter section', async () => {
      render(<FilterPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Incident Types')).toBeInTheDocument();
      });
    });

    it('renders severity filter section', async () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByText('Severity')).toBeInTheDocument();
    });

    it('shows date presets in dropdown', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
      expect(screen.getByText('Last 90 Days')).toBeInTheDocument();
      expect(screen.getByText('This Year')).toBeInTheDocument();
    });

    it('shows severity options', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });
  });

  describe('Collapsible Behavior', () => {
    it('is expanded by default', () => {
      render(<FilterPanel {...defaultProps} />);

      const panel = document.querySelector('.filter-panel');
      expect(panel).toHaveClass('expanded');
    });

    it('collapses when toggle is clicked', () => {
      render(<FilterPanel {...defaultProps} />);

      const toggle = screen.getByText('Filters').closest('.filter-panel-toggle');
      fireEvent.click(toggle);

      const panel = document.querySelector('.filter-panel');
      expect(panel).toHaveClass('collapsed');
    });

    it('expands when toggle is clicked again', () => {
      render(<FilterPanel {...defaultProps} />);

      const toggle = screen.getByText('Filters').closest('.filter-panel-toggle');
      fireEvent.click(toggle);
      fireEvent.click(toggle);

      const panel = document.querySelector('.filter-panel');
      expect(panel).toHaveClass('expanded');
    });

    it('shows chevron indicator', () => {
      render(<FilterPanel {...defaultProps} />);

      const chevron = document.querySelector('.filter-chevron');
      expect(chevron).toBeInTheDocument();
      expect(chevron.textContent).toBe('▲'); // Up when expanded
    });

    it('changes chevron when collapsed', () => {
      render(<FilterPanel {...defaultProps} />);

      const toggle = screen.getByText('Filters').closest('.filter-panel-toggle');
      fireEvent.click(toggle);

      const chevron = document.querySelector('.filter-chevron');
      expect(chevron.textContent).toBe('▼'); // Down when collapsed
    });
  });

  describe('Date Range Selection', () => {
    it('calls onChange when date preset is selected', () => {
      const onChange = vi.fn();
      render(<FilterPanel {...defaultProps} onChange={onChange} />);

      const select = document.querySelector('.filter-select');
      fireEvent.change(select, { target: { value: 'last30' } });

      expect(onChange).toHaveBeenCalledWith({
        dateRange: { preset: 'last30' }
      });
    });

    it('shows custom date inputs when Custom Range is selected', () => {
      render(<FilterPanel {...defaultProps} filters={{ dateRange: { preset: 'custom' } }} />);

      expect(document.querySelector('.filter-custom-dates')).toBeInTheDocument();
    });

    it('hides custom date inputs for preset values', () => {
      render(<FilterPanel {...defaultProps} filters={{ dateRange: { preset: 'last30' } }} />);

      expect(document.querySelector('.filter-custom-dates')).not.toBeInTheDocument();
    });
  });

  describe('Sites Filter', () => {
    it('loads sites from API', async () => {
      render(<FilterPanel {...defaultProps} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/sites');
      });
    });

    it('displays site names as checkboxes', async () => {
      render(<FilterPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Warehouse A')).toBeInTheDocument();
        expect(screen.getByText('Factory B')).toBeInTheDocument();
        expect(screen.getByText('Office C')).toBeInTheDocument();
      });
    });

    it('shows empty message when no sites available', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/sites') {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: [] });
      });

      render(<FilterPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No sites available')).toBeInTheDocument();
      });
    });

    it('shows "All" button to select all sites', async () => {
      render(<FilterPanel {...defaultProps} />);

      await waitFor(() => {
        const allButtons = screen.getAllByText('All');
        expect(allButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Incident Types Filter', () => {
    it('loads incident types from API', async () => {
      render(<FilterPanel {...defaultProps} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/incident-types');
      });
    });

    it('displays incident type names as checkboxes', async () => {
      render(<FilterPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Slip/Trip/Fall')).toBeInTheDocument();
        expect(screen.getByText('Chemical Spill')).toBeInTheDocument();
        expect(screen.getByText('Equipment Failure')).toBeInTheDocument();
      });
    });
  });

  describe('Severity Filter', () => {
    it('displays severity options as checkboxes', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('calls onChange when severity is toggled', () => {
      const onChange = vi.fn();
      render(<FilterPanel {...defaultProps} onChange={onChange} />);

      const highCheckbox = screen.getByText('High').previousSibling;
      fireEvent.click(highCheckbox);

      expect(onChange).toHaveBeenCalledWith({
        severities: ['high']
      });
    });
  });

  describe('Active Filter Count', () => {
    it('shows filter count when filters are active', () => {
      render(<FilterPanel {...defaultProps} filters={{
        siteIds: ['site-1'],
        severities: ['high']
      }} />);

      const countBadge = document.querySelector('.filter-count');
      expect(countBadge).toBeInTheDocument();
      expect(countBadge.textContent).toBe('2');
    });

    it('does not show filter count when no filters are active', () => {
      render(<FilterPanel {...defaultProps} filters={{}} />);

      const countBadge = document.querySelector('.filter-count');
      expect(countBadge).not.toBeInTheDocument();
    });
  });

  describe('Clear Filters', () => {
    it('shows Clear All button when filters are active', () => {
      render(<FilterPanel {...defaultProps} filters={{
        siteIds: ['site-1']
      }} />);

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('calls onClear when Clear All is clicked', () => {
      const onClear = vi.fn();
      render(<FilterPanel {...defaultProps} onClear={onClear} filters={{
        siteIds: ['site-1']
      }} />);

      fireEvent.click(screen.getByText('Clear All'));

      expect(onClear).toHaveBeenCalled();
    });

    it('hides Clear All button when no filters are active', () => {
      render(<FilterPanel {...defaultProps} filters={{}} />);

      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('disables inputs when loading', () => {
      render(<FilterPanel {...defaultProps} loading />);

      const select = document.querySelector('.filter-select');
      expect(select).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has aria-expanded on toggle button', () => {
      render(<FilterPanel {...defaultProps} />);

      const toggle = screen.getByText('Filters').closest('.filter-panel-toggle');
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('updates aria-expanded when collapsed', () => {
      render(<FilterPanel {...defaultProps} />);

      const toggle = screen.getByText('Filters').closest('.filter-panel-toggle');
      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('API Error Handling', () => {
    it('handles API errors gracefully', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      // Should not throw
      render(<FilterPanel {...defaultProps} />);

      await waitFor(() => {
        // Component should still render
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });
    });

    it('shows empty message when API returns error', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      render(<FilterPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No sites available')).toBeInTheDocument();
      });
    });
  });
});
