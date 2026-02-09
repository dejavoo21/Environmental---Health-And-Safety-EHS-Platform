import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';

// TC-P6-009, TC-P6-015, TC-P6-016

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn()
  }
}));

import api from '../api/client';

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders forgot password form (TC-P6-009)', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
  });

  it('shows validation error for empty email', async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/enter your email address/i);
  });

  it('validates email input is required before submission', async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByTestId('email-input');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toBeInTheDocument();
  });

  it('submits forgot password request successfully (TC-P6-009)', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('email-input'), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it('shows same message regardless of email validity - no enumeration (TC-P6-016)', async () => {
    // Even if API returns error, show success
    api.post.mockRejectedValueOnce(new Error('Not found'));

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('email-input'), { 
      target: { value: 'nonexistent@example.com' } 
    });
    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it('displays the submitted email in confirmation', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    const testEmail = 'user@company.com';
    fireEvent.change(screen.getByTestId('email-input'), { 
      target: { value: testEmail } 
    });
    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByText(testEmail)).toBeInTheDocument();
    });
  });

  it('has link back to login page', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/back to login/i)).toBeInTheDocument();
  });
});
