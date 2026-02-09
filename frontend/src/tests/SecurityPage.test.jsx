import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SecurityPage from '../pages/SecurityPage';

// TC-P6-024, TC-P6-027, TC-P6-028, TC-P6-029, TC-P6-030

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}));

import api from '../api/client';

const mockSecurityInfo = {
  accountStatus: 'active',
  twoFactorEnabled: true,
  twoFactorEnabledAt: '2026-01-15T10:00:00Z',
  backupCodesRemaining: 8,
  passwordLastChanged: '2026-01-01T10:00:00Z',
  lastLogin: {
    at: '2026-02-04T09:30:00Z',
    ipAddress: '192.168.1.xxx'
  }
};

const mockLoginHistory = [
  {
    at: '2026-02-04T09:30:00Z',
    ipAddress: '192.168.1.xxx',
    browser: 'Chrome 120',
    location: 'London, UK',
    success: true
  },
  {
    at: '2026-02-03T18:15:00Z',
    ipAddress: '10.0.0.xxx',
    browser: 'Safari 17',
    location: 'Manchester, UK',
    success: false,
    failureReason: 'invalid_password'
  }
];

describe('SecurityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/users/me/security') {
        return Promise.resolve({ data: mockSecurityInfo });
      }
      if (url === '/users/me/login-history') {
        return Promise.resolve({ data: { data: mockLoginHistory } });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('renders security page with sections (TC-P6-027)', async () => {
    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByText('Login History')).toBeInTheDocument();
    });
  });

  it('shows 2FA status when enabled (TC-P6-028)', async () => {
    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByText(/8 of 10/)).toBeInTheDocument();
    });
  });

  it('shows enable 2FA button when disabled', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/users/me/security') {
        return Promise.resolve({ 
          data: { ...mockSecurityInfo, twoFactorEnabled: false } 
        });
      }
      if (url === '/users/me/login-history') {
        return Promise.resolve({ data: { data: mockLoginHistory } });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('enable-2fa-btn')).toBeInTheDocument();
    });
  });

  it('shows login history table (TC-P6-029)', async () => {
    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-history-table')).toBeInTheDocument();
      expect(screen.getByText('Chrome 120')).toBeInTheDocument();
      expect(screen.getByText('London, UK')).toBeInTheDocument();
    });
  });

  it('shows success/failure badges in login history', async () => {
    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('shows change password form when clicked (TC-P6-030)', async () => {
    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('change-password-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('change-password-btn'));

    expect(screen.getByTestId('current-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
  });

  it('can change password successfully (TC-P6-030)', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('change-password-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('change-password-btn'));

    fireEvent.change(screen.getByTestId('current-password-input'), {
      target: { value: 'OldP@ssword123' }
    });
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'NewP@ssword456' }
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'NewP@ssword456' }
    });

    fireEvent.click(screen.getByTestId('save-password-btn'));

    await waitFor(() => {
      expect(screen.getByText(/changed successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error for incorrect current password', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { code: 'INCORRECT_PASSWORD' } }
    });

    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('change-password-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('change-password-btn'));

    fireEvent.change(screen.getByTestId('current-password-input'), {
      target: { value: 'WrongP@ss' }
    });
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'NewP@ssword456' }
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'NewP@ssword456' }
    });

    fireEvent.click(screen.getByTestId('save-password-btn'));

    await waitFor(() => {
      expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
    });
  });

  it('can open disable 2FA modal (TC-P6-024)', async () => {
    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('disable-2fa-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('disable-2fa-btn'));

    expect(screen.getByTestId('disable-2fa-modal')).toBeInTheDocument();
  });

  it('can disable 2FA successfully (TC-P6-024)', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } });

    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('disable-2fa-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('disable-2fa-btn'));
    
    fireEvent.change(screen.getByTestId('disable-2fa-code'), {
      target: { value: '123456' }
    });

    fireEvent.click(screen.getByTestId('confirm-disable-2fa-btn'));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/auth/2fa', { data: { code: '123456' } });
    });
  });
});
