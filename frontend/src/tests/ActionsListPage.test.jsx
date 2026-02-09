import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ActionsListPage from '../pages/ActionsListPage';

// TC-ACT-01, TC-ACT-02, TC-ACT-03: Actions list tests

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn()
  }
}));

// Mock the auth context
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', role: 'worker', firstName: 'Test', lastName: 'User' }
  })
}));

import api from '../api/client';

describe('ActionsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially (TC-ACT-01)', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <ActionsListPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays actions list when data loads (TC-ACT-01)', async () => {
    api.get.mockResolvedValueOnce({ data: { sites: [] } });
    api.get.mockResolvedValueOnce({
      data: {
        actions: [
          {
            id: '1',
            title: 'Fix safety issue',
            status: 'open',
            sourceType: 'incident',
            dueDate: '2025-12-31',
            assignedTo: { firstName: 'John', lastName: 'Doe' }
          }
        ]
      }
    });

    render(
      <MemoryRouter>
        <ActionsListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Fix safety issue')).toBeInTheDocument();
    });
  });

  it('shows empty state when no actions (TC-ACT-02)', async () => {
    api.get.mockResolvedValueOnce({ data: { sites: [] } });
    api.get.mockResolvedValueOnce({ data: { actions: [] } });

    render(
      <MemoryRouter>
        <ActionsListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Use getByRole to find the heading specifically
      expect(screen.getByRole('heading', { name: /No Actions Assigned to You/i })).toBeInTheDocument();
    });
  });

  it('shows error when API fails (TC-ACT-03)', async () => {
    api.get.mockResolvedValueOnce({ data: { sites: [] } });
    api.get.mockRejectedValueOnce({ response: { status: 500 } });

    render(
      <MemoryRouter>
        <ActionsListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/unable to load/i)).toBeInTheDocument();
    });
  });
});

describe('ActionsListPage - Manager View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows view toggle for manager (TC-ACT-04)', async () => {
    // Re-mock auth for manager
    vi.doMock('../auth/AuthContext', () => ({
      useAuth: () => ({
        user: { id: '1', role: 'manager', firstName: 'Test', lastName: 'Manager' }
      })
    }));

    api.get.mockResolvedValue({ data: { sites: [], actions: [] } });

    render(
      <MemoryRouter>
        <ActionsListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('My Actions')).toBeInTheDocument();
    });
  });
});
