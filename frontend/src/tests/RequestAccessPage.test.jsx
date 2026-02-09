import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RequestAccessPage from '../pages/RequestAccessPage';

// TC-P6-001, TC-P6-002, TC-P6-003, TC-P6-004

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn()
  }
}));

import api from '../api/client';

describe('RequestAccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders access request form', () => {
    render(
      <MemoryRouter>
        <RequestAccessPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Request Access')).toBeInTheDocument();
    expect(screen.getByTestId('fullname-input')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('org-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('role-select')).toBeInTheDocument();
    expect(screen.getByTestId('terms-checkbox')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <MemoryRouter>
        <RequestAccessPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/organisation code is required/i)).toBeInTheDocument();
    });
  });

  it('validates email input type', async () => {
    render(
      <MemoryRouter>
        <RequestAccessPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByTestId('email-input');
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('requires terms acceptance', async () => {
    render(
      <MemoryRouter>
        <RequestAccessPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('fullname-input'), {
      target: { value: 'John Smith' }
    });
    fireEvent.change(screen.getByTestId('email-input'), {
      target: { value: 'john@example.com' }
    });
    fireEvent.change(screen.getByTestId('org-code-input'), {
      target: { value: 'ACME' }
    });
    fireEvent.change(screen.getByTestId('role-select'), {
      target: { value: 'worker' }
    });
    // Don't check terms
    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByText(/must accept the terms/i)).toBeInTheDocument();
    });
  });

  it('submits valid access request (TC-P6-001)', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        referenceNumber: 'AR-2026-0042'
      }
    });

    render(
      <MemoryRouter>
        <RequestAccessPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('fullname-input'), {
      target: { value: 'John Smith' }
    });
    fireEvent.change(screen.getByTestId('email-input'), {
      target: { value: 'john@example.com' }
    });
    fireEvent.change(screen.getByTestId('org-code-input'), {
      target: { value: 'ACME' }
    });
    fireEvent.change(screen.getByTestId('role-select'), {
      target: { value: 'worker' }
    });
    fireEvent.click(screen.getByTestId('terms-checkbox'));
    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByText(/request submitted/i)).toBeInTheDocument();
      expect(screen.getByTestId('reference-number')).toHaveTextContent('AR-2026-0042');
    });
  });

  it('shows error for invalid org code (TC-P6-002)', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { code: 'INVALID_ORG' } }
    });

    render(
      <MemoryRouter>
        <RequestAccessPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('fullname-input'), {
      target: { value: 'John Smith' }
    });
    fireEvent.change(screen.getByTestId('email-input'), {
      target: { value: 'john@example.com' }
    });
    fireEvent.change(screen.getByTestId('org-code-input'), {
      target: { value: 'INVALID' }
    });
    fireEvent.change(screen.getByTestId('role-select'), {
      target: { value: 'worker' }
    });
    fireEvent.click(screen.getByTestId('terms-checkbox'));
    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });

  it('shows error for duplicate request (TC-P6-004)', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { code: 'DUPLICATE_REQUEST' } }
    });

    render(
      <MemoryRouter>
        <RequestAccessPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('fullname-input'), {
      target: { value: 'John Smith' }
    });
    fireEvent.change(screen.getByTestId('email-input'), {
      target: { value: 'john@example.com' }
    });
    fireEvent.change(screen.getByTestId('org-code-input'), {
      target: { value: 'ACME' }
    });
    fireEvent.change(screen.getByTestId('role-select'), {
      target: { value: 'worker' }
    });
    fireEvent.click(screen.getByTestId('terms-checkbox'));
    fireEvent.click(screen.getByTestId('submit-btn'));

    await waitFor(() => {
      expect(screen.getByText(/pending access request/i)).toBeInTheDocument();
    });
  });

  it('shows character counter for reason field', () => {
    render(
      <MemoryRouter>
        <RequestAccessPage />
      </MemoryRouter>
    );

    // Character counter is split across elements, use function matcher
    expect(screen.getByText((content, element) => {
      return element.className === 'field-hint' && content.includes('/500');
    })).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('reason-input'), {
      target: { value: 'Test reason' }
    });

    expect(screen.getByText((content, element) => {
      return element.className === 'field-hint' && content.includes('11');
    })).toBeInTheDocument();
  });

  it('converts org code to uppercase', () => {
    render(
      <MemoryRouter>
        <RequestAccessPage />
      </MemoryRouter>
    );

    const input = screen.getByTestId('org-code-input');
    fireEvent.change(input, { target: { value: 'acme' } });

    expect(input.value).toBe('ACME');
  });
});
