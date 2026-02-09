import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import NotificationPreferencesPage from '../pages/NotificationPreferencesPage';

// Mock API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn()
  }
}));

import api from '../api/client';

const mockPreferences = {
  id: 'pref-1',
  userId: 'user-1',
  emailActionAssigned: true,
  emailActionOverdue: true,
  emailHighSeverityIncident: true,
  emailInspectionFailed: false,
  digestFrequency: 'weekly',
  digestTime: '07:00',
  digestDayOfWeek: 1,
  inappEnabled: true
};

describe('NotificationPreferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({
      data: { success: true, data: mockPreferences }
    });
  });

  it('renders page title', async () => {
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /notification settings/i })).toBeInTheDocument();
    });
  });

  it('loads and displays current preferences', async () => {
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/preferences/notifications');
    });

    // Check checkboxes are rendered with correct state
    await waitFor(() => {
      const actionAssignedCheckbox = screen.getByLabelText(/action assigned to me/i);
      expect(actionAssignedCheckbox).toBeInTheDocument();
    });
  });

  it('shows email notification toggles', async () => {
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/action assigned to me/i)).toBeInTheDocument();
      expect(screen.getByText(/my actions become overdue/i)).toBeInTheDocument();
      expect(screen.getByText(/high-severity incidents/i)).toBeInTheDocument();
      expect(screen.getByText(/inspections with failed items/i)).toBeInTheDocument();
    });
  });

  it('shows digest frequency dropdown', async () => {
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/frequency/i)).toBeInTheDocument();
    });
  });

  it('shows Save and Cancel buttons', async () => {
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  it('enables save button when changes are made', async () => {
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
    });

    // Toggle a checkbox
    const inspectionCheckbox = screen.getByLabelText(/inspections with failed items/i);
    fireEvent.click(inspectionCheckbox);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
    });
  });

  it('calls API to save preferences when save is clicked', async () => {
    api.put.mockResolvedValue({
      data: {
        success: true,
        data: { ...mockPreferences, emailInspectionFailed: true }
      }
    });

    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/inspections with failed items/i)).toBeInTheDocument();
    });

    // Toggle a checkbox
    const inspectionCheckbox = screen.getByLabelText(/inspections with failed items/i);
    fireEvent.click(inspectionCheckbox);

    // Click save
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/preferences/notifications', expect.objectContaining({
        emailInspectionFailed: true
      }));
    });
  });

  it('reverts changes when cancel is clicked', async () => {
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/inspections with failed items/i)).toBeInTheDocument();
    });

    // Toggle a checkbox (was false, now true)
    const inspectionCheckbox = screen.getByLabelText(/inspections with failed items/i);
    fireEvent.click(inspectionCheckbox);

    // Click cancel
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Save button should be disabled again (no changes)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
    });
  });

  it('shows digest time dropdown when frequency is not none', async () => {
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Weekly is the default from mock, so time dropdown should show
      expect(screen.getByLabelText(/delivery time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/day of week/i)).toBeInTheDocument();
    });
  });

  it('hides digest options when frequency is none', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: { ...mockPreferences, digestFrequency: 'none' }
      }
    });

    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/delivery time/i)).not.toBeInTheDocument();
    });
  });

  it('shows in-app notifications toggle', async () => {
    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/enable in-app notifications/i)).toBeInTheDocument();
    });
  });

  it('shows success toast after saving', async () => {
    api.put.mockResolvedValue({
      data: { success: true, data: mockPreferences }
    });

    render(
      <MemoryRouter>
        <NotificationPreferencesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/inspections with failed items/i)).toBeInTheDocument();
    });

    // Toggle and save
    fireEvent.click(screen.getByLabelText(/inspections with failed items/i));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/notification preferences saved/i)).toBeInTheDocument();
    });
  });
});
