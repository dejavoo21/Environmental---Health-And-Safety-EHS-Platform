import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import ActionDetailPage from '../pages/ActionDetailPage';

// TC-ACT-05, TC-ACT-06, TC-ACT-07: Action detail tests

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn()
  }
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', role: 'worker', firstName: 'Test', lastName: 'User' }
  })
}));

import api from '../api/client';

const mockAction = {
  id: '1',
  title: 'Fix safety issue',
  description: 'Need to fix the hazard',
  status: 'open',
  sourceType: 'incident',
  sourceId: '10',
  dueDate: '2025-12-31',
  assignedTo: { id: '1', firstName: 'Test', lastName: 'User' },
  createdBy: { firstName: 'Manager', lastName: 'Admin' }
};

describe('ActionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes('/actions/') && !url.includes('audit-log')) {
        return Promise.resolve({ data: mockAction });
      }
      if (url.includes('audit-log')) {
        return Promise.resolve({ data: { events: [] } });
      }
      if (url.includes('/attachments')) {
        return Promise.resolve({ data: { attachments: [] } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  const renderWithRouter = () => {
    render(
      <MemoryRouter initialEntries={['/actions/1']}>
        <Routes>
          <Route path="/actions/:id" element={<ActionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('displays action details (TC-ACT-05)', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Fix safety issue')).toBeInTheDocument();
    });

    expect(screen.getByText(/need to fix the hazard/i)).toBeInTheDocument();
    expect(screen.getByText(/test user/i)).toBeInTheDocument();
  });

  it('shows status update controls for assignee (TC-ACT-06)', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Fix safety issue')).toBeInTheDocument();
    });

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });

  it('shows error when action not found (TC-ACT-07)', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 404 } });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });

  it('shows source link to incident (TC-ACT-08)', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Fix safety issue')).toBeInTheDocument();
    });

    expect(screen.getByText(/view incident/i)).toBeInTheDocument();
  });
});
