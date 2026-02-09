import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AdminAccessRequestsPage from '../pages/AdminAccessRequestsPage';

// TC-P6-005, TC-P6-006, TC-P6-007, TC-P6-008

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

import api from '../api/client';

const mockAccessRequests = {
  data: [
    {
      id: 'ar-001',
      referenceNumber: 'REQ-2026-0001',
      fullName: 'John Smith',
      email: 'john.smith@company.com',
      organisationCode: 'ORG001',
      requestedRole: 'employee',
      reason: 'New employee joining the EHS team',
      status: 'pending',
      createdAt: '2026-02-01T10:00:00Z'
    },
    {
      id: 'ar-002',
      referenceNumber: 'REQ-2026-0002',
      fullName: 'Jane Doe',
      email: 'jane.doe@company.com',
      organisationCode: 'ORG002',
      requestedRole: 'manager',
      reason: 'Transfer to safety department',
      status: 'pending',
      createdAt: '2026-02-02T14:30:00Z'
    },
    {
      id: 'ar-003',
      referenceNumber: 'REQ-2026-0003',
      fullName: 'Bob Wilson',
      email: 'bob.wilson@company.com',
      organisationCode: 'ORG001',
      requestedRole: 'employee',
      reason: 'Contractor access request',
      status: 'approved',
      createdAt: '2026-01-20T09:00:00Z',
      reviewedAt: '2026-01-21T15:00:00Z',
      reviewedBy: 'admin@ehs.com'
    }
  ],
  pagination: {
    total: 3,
    page: 1,
    limit: 20,
    totalPages: 1
  },
  counts: {
    pending: 2,
    approved: 1,
    rejected: 0
  }
};

describe('AdminAccessRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: mockAccessRequests });
  });

  it('renders access requests page with table (TC-P6-005)', async () => {
    render(
      <MemoryRouter>
        <AdminAccessRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Requests')).toBeInTheDocument();
      expect(screen.getByTestId('requests-table')).toBeInTheDocument();
    });
  });

  it('shows pending requests count (TC-P6-005)', async () => {
    render(
      <MemoryRouter>
        <AdminAccessRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Look for the counts bar with pending count
      const pendingCount = screen.getByText('2');
      expect(pendingCount).toBeInTheDocument();
    });
  });

  it('displays request details in table', async () => {
    render(
      <MemoryRouter>
        <AdminAccessRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('john.smith@company.com')).toBeInTheDocument();
      expect(screen.getByText('REQ-2026-0001')).toBeInTheDocument();
    });
  });

  it('can filter by status', async () => {
    render(
      <MemoryRouter>
        <AdminAccessRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status-filter')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('status-filter'), {
      target: { value: 'approved' }
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/admin/access-requests', {
        params: expect.objectContaining({ status: 'approved' })
      });
    });
  });

  it('can view request details in modal (TC-P6-008)', async () => {
    render(
      <MemoryRouter>
        <AdminAccessRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    // Find the view button in the first row
    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('request-modal')).toBeInTheDocument();
    });
  });

  it('can approve pending request (TC-P6-006)', async () => {
    api.post.mockResolvedValueOnce({
      data: { success: true }
    });

    render(
      <MemoryRouter>
        <AdminAccessRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    // Find the approve button for first pending request
    const approveBtn = screen.getByTestId('approve-ar-001');
    fireEvent.click(approveBtn);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByTestId('request-modal')).toBeInTheDocument();
    });
  });

  it('can reject pending request (TC-P6-007)', async () => {
    api.post.mockResolvedValueOnce({
      data: { success: true }
    });

    render(
      <MemoryRouter>
        <AdminAccessRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    // Find the reject button for first pending request
    const rejectBtn = screen.getByTestId('reject-ar-001');
    fireEvent.click(rejectBtn);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByTestId('request-modal')).toBeInTheDocument();
    });
  });

  it('hides approve/reject buttons for non-pending requests', async () => {
    render(
      <MemoryRouter>
        <AdminAccessRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    // The approved request (ar-003) should not have approve/reject buttons
    expect(screen.queryByTestId('approve-ar-003')).toBeNull();
    expect(screen.queryByTestId('reject-ar-003')).toBeNull();
  });

  it('handles pagination when multiple pages exist', async () => {
    const paginatedData = {
      ...mockAccessRequests,
      pagination: { total: 60, page: 1, limit: 20, totalPages: 3 }
    };
    api.get.mockResolvedValueOnce({ data: paginatedData });

    render(
      <MemoryRouter>
        <AdminAccessRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Next →')).toBeInTheDocument();
    });

    const nextBtn = screen.getByText('Next →');
    expect(nextBtn).not.toBeDisabled();
  });

  it('shows status badges correctly', async () => {
    render(
      <MemoryRouter>
        <AdminAccessRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Look for badges specifically (not labels)
      const badges = document.querySelectorAll('.badge');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('shows empty state when no requests', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
        counts: { pending: 0, approved: 0, rejected: 0 }
      }
    });

    render(
      <MemoryRouter>
        <AdminAccessRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no access requests found/i)).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    api.get.mockRejectedValueOnce({
      response: { data: { message: 'Server error' } }
    });

    render(
      <MemoryRouter>
        <AdminAccessRequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
