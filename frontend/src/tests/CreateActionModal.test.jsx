import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CreateActionModal from '../components/CreateActionModal';

// TC-ACT-09, TC-ACT-10, TC-ACT-11: Create action modal tests

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Mock useAuth to provide current user
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '2', role: 'manager', firstName: 'Jane', lastName: 'Smith' }
  })
}));

import api from '../api/client';

describe('CreateActionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({
      data: {
        users: [
          { id: '1', firstName: 'John', lastName: 'Doe', role: 'worker' },
          { id: '2', firstName: 'Jane', lastName: 'Smith', role: 'manager' }
        ]
      }
    });
  });

  const renderModal = () => {
    render(
      <CreateActionModal
        sourceType="incident"
        sourceId="1"
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    );
  };

  it('displays modal with form fields (TC-ACT-09)', async () => {
    renderModal();

    // Use getByRole for heading to avoid duplicate text issue
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Action' })).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/enter action title/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe what needs/i)).toBeInTheDocument();
    expect(screen.getByText(/assign to/i)).toBeInTheDocument();
    expect(screen.getByText(/due date/i)).toBeInTheDocument();
  });

  it('shows validation error when title is empty (TC-ACT-10)', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Action' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /create action/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when assignee is not selected (TC-ACT-11)', async () => {
    // For this test, mock that current user is NOT in the users list so no default is set
    api.get.mockResolvedValueOnce({
      data: {
        users: [
          { id: '10', firstName: 'Other', lastName: 'User', role: 'worker' }
        ]
      }
    });

    renderModal();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Action' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/enter action title/i), {
      target: { value: 'Test Action' }
    });

    fireEvent.click(screen.getByRole('button', { name: /create action/i }));

    await waitFor(() => {
      expect(screen.getByText(/select an assignee/i)).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel is clicked (TC-ACT-12)', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Action' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked (TC-ACT-13)', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Action' })).toBeInTheDocument();
    });

    // Find and click the overlay (modal-overlay class)
    const overlay = document.querySelector('.modal-overlay');
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('loads users for assignee dropdown (TC-ACT-14)', async () => {
    renderModal();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users');
    });

    await waitFor(() => {
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });
  });
});
