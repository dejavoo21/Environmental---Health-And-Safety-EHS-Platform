import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TwoFactorSetup from '../components/security/TwoFactorSetup';

// TC-P6-017, TC-P6-018, TC-P6-023

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn()
  }
}));

import api from '../api/client';

describe('TwoFactorSetup', () => {
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValueOnce({
      data: {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCodeUrl: 'data:image/png;base64,test',
        manualEntryKey: 'JBSW Y3DP EHPK 3PXP',
        issuer: 'EHS Portal',
        accountName: 'test@example.com'
      }
    });
  });

  it('renders setup wizard with QR code step', async () => {
    render(
      <TwoFactorSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    await waitFor(() => {
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });
  });

  it('shows manual entry key (TC-P6-018)', async () => {
    render(
      <TwoFactorSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('manual-key')).toHaveTextContent('JBSW Y3DP EHPK 3PXP');
    });
  });

  it('navigates to verify step on continue', async () => {
    render(
      <TwoFactorSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    await waitFor(() => {
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/continue/i));

    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByTestId('otp-input')).toBeInTheDocument();
  });

  it('verifies TOTP code and shows backup codes (TC-P6-017)', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        enabled: true,
        backupCodes: ['ABCD1234', 'EFGH5678', 'IJKL9012', 'MNOP3456', 'QRST7890', 'UVWX1234', 'YZAB5678', 'CDEF9012', 'GHIJ3456', 'KLMN7890']
      }
    });

    render(
      <TwoFactorSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    await waitFor(() => {
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });

    // Go to verify step
    fireEvent.click(screen.getByText(/continue/i));

    // Enter 6 digit code
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx + 1) } });
    });

    fireEvent.click(screen.getByText(/verify & continue/i));

    await waitFor(() => {
      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
      expect(screen.getByTestId('backup-codes-display')).toBeInTheDocument();
    });
  });

  it('shows error for invalid TOTP code', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { message: 'Invalid verification code' } }
    });

    render(
      <TwoFactorSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    await waitFor(() => {
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/continue/i));

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx) } });
    });

    fireEvent.click(screen.getByText(/verify & continue/i));

    await waitFor(() => {
      expect(screen.getByText(/invalid/i)).toBeInTheDocument();
    });
  });

  it('requires saving backup codes before completing', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        enabled: true,
        backupCodes: ['ABCD1234', 'EFGH5678', 'IJKL9012', 'MNOP3456', 'QRST7890', 'UVWX1234', 'YZAB5678', 'CDEF9012', 'GHIJ3456', 'KLMN7890']
      }
    });

    render(
      <TwoFactorSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    await waitFor(() => {
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/continue/i));

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx + 1) } });
    });

    fireEvent.click(screen.getByText(/verify & continue/i));

    await waitFor(() => {
      expect(screen.getByTestId('complete-setup-btn')).toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('codes-saved-checkbox'));

    expect(screen.getByTestId('complete-setup-btn')).not.toBeDisabled();
  });

  it('calls onCancel when cancel clicked', async () => {
    render(
      <TwoFactorSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    await waitFor(() => {
      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/cancel/i));

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
