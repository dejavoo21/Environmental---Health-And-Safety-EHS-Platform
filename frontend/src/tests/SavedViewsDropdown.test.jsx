import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SavedViewsDropdown from '../components/analytics/SavedViewsDropdown';

describe('SavedViewsDropdown', () => {
  const mockViews = [
    { id: 'view-1', name: 'Monthly Review', is_default: true, is_shared: false, is_owner: true },
    { id: 'view-2', name: 'Quarterly Report', is_default: false, is_shared: false, is_owner: true },
    { id: 'view-3', name: 'Team Dashboard', is_default: false, is_shared: true, is_owner: false, owner_name: 'Admin User' }
  ];

  const defaultProps = {
    views: mockViews,
    currentViewId: null,
    onSelectView: vi.fn(),
    onSaveView: vi.fn(),
    onManageViews: vi.fn(),
    loading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Trigger Button', () => {
    it('renders trigger button with "Saved Views" text', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      expect(screen.getByText('Saved Views')).toBeInTheDocument();
    });

    it('shows current view name when a view is selected', () => {
      render(<SavedViewsDropdown {...defaultProps} currentViewId="view-1" />);

      expect(screen.getByText('Monthly Review')).toBeInTheDocument();
    });

    it('shows chevron icon', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      // Chevron is ▼ when closed
      expect(screen.getByText('▼')).toBeInTheDocument();
    });
  });

  describe('Dropdown Behavior', () => {
    it('opens dropdown on click', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      expect(screen.getByPlaceholderText('Search views...')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      render(
        <div>
          <SavedViewsDropdown {...defaultProps} />
          <button data-testid="outside">Outside</button>
        </div>
      );

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      expect(screen.getByPlaceholderText('Search views...')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search views...')).not.toBeInTheDocument();
      });
    });

    it('shows chevron up when open', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      // Chevron is ▲ when open
      expect(screen.getByText('▲')).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('renders search input in dropdown', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      expect(screen.getByPlaceholderText('Search views...')).toBeInTheDocument();
    });

    it('filters views based on search input', async () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      const searchInput = screen.getByPlaceholderText('Search views...');
      fireEvent.change(searchInput, { target: { value: 'Monthly' } });

      expect(screen.getByText('Monthly Review')).toBeInTheDocument();
      expect(screen.queryByText('Quarterly Report')).not.toBeInTheDocument();
    });

    it('shows "No views match" when search has no results', async () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      const searchInput = screen.getByPlaceholderText('Search views...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No views match your search')).toBeInTheDocument();
    });
  });

  describe('View Sections', () => {
    it('shows "MY VIEWS" section for personal views', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      expect(screen.getByText('MY VIEWS')).toBeInTheDocument();
      expect(screen.getByText('Monthly Review')).toBeInTheDocument();
      expect(screen.getByText('Quarterly Report')).toBeInTheDocument();
    });

    it('shows "SHARED VIEWS" section for shared views', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      expect(screen.getByText('SHARED VIEWS')).toBeInTheDocument();
      expect(screen.getByText('Team Dashboard')).toBeInTheDocument();
    });

    it('hides section if no views in that category', () => {
      const personalOnlyViews = mockViews.filter(v => v.is_owner);
      render(<SavedViewsDropdown {...defaultProps} views={personalOnlyViews} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      expect(screen.getByText('MY VIEWS')).toBeInTheDocument();
      expect(screen.queryByText('SHARED VIEWS')).not.toBeInTheDocument();
    });
  });

  describe('View Items', () => {
    it('shows view name', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      expect(screen.getByText('Monthly Review')).toBeInTheDocument();
    });

    it('shows default star for default view', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      // Default view shows a star
      expect(screen.getByText('★')).toBeInTheDocument();
    });

    it('highlights currently selected view', () => {
      render(<SavedViewsDropdown {...defaultProps} currentViewId="view-2" />);

      // When view-2 is selected, the trigger shows "Quarterly Report"
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      // After opening, find the active item
      const selectedItem = document.querySelector('.saved-views-item.active');
      expect(selectedItem).toBeInTheDocument();
      expect(selectedItem).toHaveAttribute('aria-selected', 'true');
    });

    it('calls onSelectView when view is clicked', () => {
      const onSelectView = vi.fn();
      render(<SavedViewsDropdown {...defaultProps} onSelectView={onSelectView} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      const viewItem = screen.getByText('Quarterly Report').closest('.saved-views-item');
      fireEvent.click(viewItem);

      expect(onSelectView).toHaveBeenCalledWith('view-2');
    });
  });

  describe('Actions', () => {
    it('shows "Save Current View" button', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      expect(screen.getByText('+ Save Current View')).toBeInTheDocument();
    });

    it('shows "Manage Views" button when user has views', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      expect(screen.getByText('Manage Views...')).toBeInTheDocument();
    });

    it('does not show "Manage Views" button when user has no views', () => {
      const sharedOnlyViews = mockViews.filter(v => !v.is_owner);
      render(<SavedViewsDropdown {...defaultProps} views={sharedOnlyViews} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      expect(screen.queryByText('Manage Views...')).not.toBeInTheDocument();
    });

    it('calls onSaveView when save button is clicked', () => {
      const onSaveView = vi.fn();
      render(<SavedViewsDropdown {...defaultProps} onSaveView={onSaveView} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      const saveBtn = screen.getByText('+ Save Current View');
      fireEvent.click(saveBtn);

      expect(onSaveView).toHaveBeenCalled();
    });

    it('calls onManageViews when manage button is clicked', () => {
      const onManageViews = vi.fn();
      render(<SavedViewsDropdown {...defaultProps} onManageViews={onManageViews} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      const manageBtn = screen.getByText('Manage Views...');
      fireEvent.click(manageBtn);

      expect(onManageViews).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no views exist', () => {
      render(<SavedViewsDropdown {...defaultProps} views={[]} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      expect(screen.getByText('No saved views yet')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('disables trigger when loading', () => {
      render(<SavedViewsDropdown {...defaultProps} loading />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      expect(trigger).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has correct aria-haspopup on trigger', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('has correct aria-expanded on trigger', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('menu has role listbox', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      const menu = document.querySelector('.saved-views-menu');
      expect(menu).toHaveAttribute('role', 'listbox');
    });

    it('view items have role option', () => {
      render(<SavedViewsDropdown {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /saved views/i });
      fireEvent.click(trigger);

      const items = document.querySelectorAll('.saved-views-item');
      items.forEach(item => {
        expect(item).toHaveAttribute('role', 'option');
      });
    });
  });
});
