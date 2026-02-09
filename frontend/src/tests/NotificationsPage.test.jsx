import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import NotificationsPage from '../pages/NotificationsPage';
import { NotificationProvider } from '../context/NotificationContext';

// Mock API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock AuthContext
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User', role: 'worker' }
  })
}));

import api from '../api/client';

const mockNotifications = [
  {
    id: '1',
    type: 'action_assigned',
    priority: 'normal',
    title: 'New action assigned',
    message: 'You have been assigned a new safety audit',
    isRead: false,
    relatedType: 'action',
    relatedId: 'action-1',
    metadata: { actionTitle: 'Safety audit' },
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    type: 'incident_high_severity',
    priority: 'high',
    title: 'Critical incident reported',
    message: 'A critical incident has been reported in Building A',
    isRead: true,
    relatedType: 'incident',
    relatedId: 'incident-1',
    createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
  }
];

const renderWithProviders = (component) => {
  return render(
    <MemoryRouter>
      <NotificationProvider>
        {component}
      </NotificationProvider>
    </MemoryRouter>
  );
};

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { success: true, data: { count: 1 } } });
      }
      if (url === '/notifications') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              notifications: mockNotifications,
              pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
            }
          }
        });
      }
    });
  });

  it('renders page title', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    });
  });

  it('displays notifications list', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('New action assigned')).toBeInTheDocument();
      expect(screen.getByText('Critical incident reported')).toBeInTheDocument();
    });
  });

  it('shows filter controls', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
    });
  });

  it('shows Mark all as read button when there are unread notifications', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument();
    });
  });

  it('shows high priority badge for high priority notifications', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('High Priority')).toBeInTheDocument();
    });
  });

  it('shows empty state when no notifications', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { success: true, data: { count: 0 } } });
      }
      if (url === '/notifications') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              notifications: [],
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
            }
          }
        });
      }
    });

    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });
  });

  it('filters by type when filter is changed', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    });

    const typeFilter = screen.getByLabelText(/type/i);
    fireEvent.change(typeFilter, { target: { value: 'action_assigned' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications', expect.objectContaining({
        params: expect.objectContaining({ type: 'action_assigned' })
      }));
    });
  });

  it('filters by read status when filter is changed', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    const statusFilter = screen.getByLabelText(/status/i);
    fireEvent.change(statusFilter, { target: { value: 'false' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications', expect.objectContaining({
        params: expect.objectContaining({ is_read: 'false' })
      }));
    });
  });

  it('calls mark all as read when button is clicked', async () => {
    api.put.mockResolvedValue({ data: { success: true, data: { updated: 1 } } });

    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/notifications/mark-all-read');
    });
  });

  it('shows delete button on notification cards', async () => {
    renderWithProviders(<NotificationsPage />);

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });
});
