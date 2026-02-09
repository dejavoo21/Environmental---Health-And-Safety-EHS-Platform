import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ResetPasswordPage from '../pages/ResetPasswordPage';

// TC-P6-010, TC-P6-011, TC-P6-012, TC-P6-013, TC-P6-014

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

import api from '../api/client';

const renderWithRouter = (initialUrl = '/reset-password?token=valid-token') => {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/forgot-password" element={<div>Forgot Password</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Validation', () => {
    it('shows loading state while validating token', () => {
      api.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter();

      expect(screen.getByText(/validating/i)).toBeInTheDocument();
    });

    it('shows error for missing token', async () => {
      renderWithRouter('/reset-password');

      await waitFor(() => {
        expect(screen.getByText(/no reset token/i)).toBeInTheDocument();
      });
    });

    it('shows error for expired token (TC-P6-011)', async () => {
      api.get.mockRejectedValueOnce({
        response: { data: { error: 'TOKEN_EXPIRED' } }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/expired/i)).toBeInTheDocument();
      });
    });

    it('shows error for used token (TC-P6-012)', async () => {
      api.get.mockRejectedValueOnce({
        response: { data: { error: 'TOKEN_USED' } }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/already been used/i)).toBeInTheDocument();
      });
    });

    it('shows reset form for valid token (TC-P6-010)', async () => {
      api.get.mockResolvedValueOnce({
        data: { valid: true, email: 'u***@example.com' }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
        expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
      });
    });

    it('displays masked email for valid token', async () => {
      api.get.mockResolvedValueOnce({
        data: { valid: true, email: 'u***@example.com' }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('u***@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('Password Reset Form', () => {
    beforeEach(() => {
      api.get.mockResolvedValueOnce({
        data: { valid: true, email: 'u***@example.com' }
      });
    });

    it('shows password strength meter (TC-P6-013)', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('new-password-input'), {
        target: { value: 'weak' }
      });

      expect(screen.getByTestId('password-strength-meter')).toBeInTheDocument();
    });

    it('validates password requirements', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      });

      // Enter weak password
      fireEvent.change(screen.getByTestId('new-password-input'), {
        target: { value: 'weak' }
      });
      fireEvent.change(screen.getByTestId('confirm-password-input'), {
        target: { value: 'weak' }
      });
      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByText(/does not meet/i)).toBeInTheDocument();
      });
    });

    it('validates passwords match', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('new-password-input'), {
        target: { value: 'StrongP@ss123' }
      });
      fireEvent.change(screen.getByTestId('confirm-password-input'), {
        target: { value: 'DifferentP@ss' }
      });
      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByText(/do not match/i)).toBeInTheDocument();
      });
    });

    it('submits valid password reset (TC-P6-010)', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('new-password-input'), {
        target: { value: 'StrongP@ss123' }
      });
      fireEvent.change(screen.getByTestId('confirm-password-input'), {
        target: { value: 'StrongP@ss123' }
      });
      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByText(/successfully reset/i)).toBeInTheDocument();
      });
    });

    it('shows error for password reuse (TC-P6-014)', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { code: 'PASSWORD_REUSED' } }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('new-password-input'), {
        target: { value: 'StrongP@ss123' }
      });
      fireEvent.change(screen.getByTestId('confirm-password-input'), {
        target: { value: 'StrongP@ss123' }
      });
      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByText(/cannot reuse/i)).toBeInTheDocument();
      });
    });
  });
});
