import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TwoFactorPrompt from '../components/security/TwoFactorPrompt';

// TC-P6-019, TC-P6-020, TC-P6-021, TC-P6-022

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn()
  }
}));

import api from '../api/client';

describe('TwoFactorPrompt', () => {
  const mockTempToken = 'temp-token-123';
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders TOTP input by default (TC-P6-019)', () => {
    render(
      <TwoFactorPrompt
        tempToken={mockTempToken}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
    expect(screen.getByTestId('otp-input')).toBeInTheDocument();
  });

  it('verifies valid TOTP code successfully (TC-P6-019)', async () => {
    const mockResponse = {
      token: 'full-token',
      user: { id: '1', email: 'test@example.com' }
    };
    api.post.mockResolvedValueOnce({ data: mockResponse });

    render(
      <TwoFactorPrompt
        tempToken={mockTempToken}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx + 1) } });
    });

    fireEvent.click(screen.getByTestId('verify-2fa-btn'));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  it('shows error for invalid TOTP code (TC-P6-020)', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { message: 'Invalid code' } }
    });

    render(
      <TwoFactorPrompt
        tempToken={mockTempToken}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx) } });
    });

    fireEvent.click(screen.getByTestId('verify-2fa-btn'));

    await waitFor(() => {
      expect(screen.getByText(/invalid code/i)).toBeInTheDocument();
    });
  });

  it('can switch to backup code mode (TC-P6-021)', () => {
    render(
      <TwoFactorPrompt
        tempToken={mockTempToken}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText(/use a backup code/i));

    expect(screen.getByText(/use backup code/i)).toBeInTheDocument();
    expect(screen.getByTestId('backup-code-input')).toBeInTheDocument();
  });

  it('verifies backup code successfully (TC-P6-021)', async () => {
    const mockResponse = {
      token: 'full-token',
      user: { id: '1', email: 'test@example.com' }
    };
    api.post.mockResolvedValueOnce({ data: mockResponse });

    render(
      <TwoFactorPrompt
        tempToken={mockTempToken}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText(/use a backup code/i));
    fireEvent.change(screen.getByTestId('backup-code-input'), {
      target: { value: 'ABCD1234' }
    });
    fireEvent.click(screen.getByTestId('verify-2fa-btn'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/2fa/login-verify', {
        tempToken: mockTempToken,
        code: 'ABCD1234',
        isBackupCode: true
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  it('shows error for used backup code (TC-P6-022)', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { message: 'Invalid or already used backup code' } }
    });

    render(
      <TwoFactorPrompt
        tempToken={mockTempToken}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText(/use a backup code/i));
    fireEvent.change(screen.getByTestId('backup-code-input'), {
      target: { value: 'USED1234' }
    });
    fireEvent.click(screen.getByTestId('verify-2fa-btn'));

    await waitFor(() => {
      expect(screen.getByText(/already used/i)).toBeInTheDocument();
    });
  });

  it('can switch back to TOTP mode', () => {
    render(
      <TwoFactorPrompt
        tempToken={mockTempToken}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText(/use a backup code/i));
    expect(screen.getByTestId('backup-code-input')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/use authenticator/i));
    expect(screen.getByTestId('otp-input')).toBeInTheDocument();
  });

  it('converts backup code to uppercase', () => {
    render(
      <TwoFactorPrompt
        tempToken={mockTempToken}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText(/use a backup code/i));
    const input = screen.getByTestId('backup-code-input');
    fireEvent.change(input, { target: { value: 'abcd1234' } });

    expect(input.value).toBe('ABCD1234');
  });

  it('handles max attempts error gracefully', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { code: 'MAX_ATTEMPTS', message: 'Too many failed attempts' } }
    });

    render(
      <TwoFactorPrompt
        tempToken={mockTempToken}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx) } });
    });

    fireEvent.click(screen.getByTestId('verify-2fa-btn'));

    await waitFor(() => {
      expect(screen.getByText(/too many/i)).toBeInTheDocument();
    });
  });
});
