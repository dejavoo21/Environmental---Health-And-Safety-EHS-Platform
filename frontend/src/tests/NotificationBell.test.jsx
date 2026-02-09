import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import NotificationBell from '../components/notifications/NotificationBell';
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

const renderWithProviders = (component) => {
  return render(
    <MemoryRouter>
      <NotificationProvider>
        {component}
      </NotificationProvider>
    </MemoryRouter>
  );
};

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bell icon', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { count: 0 } } });

    renderWithProviders(<NotificationBell />);

    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('shows badge with unread count when > 0', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { count: 5 } } });

    renderWithProviders(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('shows 99+ when count exceeds 99', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { count: 150 } } });

    renderWithProviders(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  it('does not show badge when count is 0', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { count: 0 } } });

    renderWithProviders(<NotificationBell />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('opens dropdown when clicked', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { success: true, data: { count: 3 } } });
      }
      if (url === '/notifications') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              notifications: [
                {
                  id: '1',
                  type: 'action_assigned',
                  title: 'Test Notification',
                  message: 'Test message',
                  isRead: false,
                  createdAt: new Date().toISOString()
                }
              ]
            }
          }
        });
      }
    });

    renderWithProviders(<NotificationBell />);

    const bellButton = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('has correct aria attributes', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { count: 5 } } });

    renderWithProviders(<NotificationBell />);

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Notifications, 5 unread');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
    });
  });
});
