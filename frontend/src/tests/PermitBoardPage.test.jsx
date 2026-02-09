import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import PermitBoardPage from '../pages/PermitBoardPage';

// TC-P7-PERM-01, TC-P7-PERM-02 (frontend permit board tests)

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../api/client', () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args)
  }
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', role: 'manager', name: 'Test Manager' }
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

const mockPermits = [
  {
    id: 'permit-1',
    permitNumber: 'PTW-2025-001',
    status: 'active',
    permitType: { id: 'pt1', name: 'Hot Work', icon: '🔥' },
    site: { id: 's1', name: 'Site A' },
    location: 'Building 1',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    requestedBy: { fullName: 'John Doe' }
  },
  {
    id: 'permit-2',
    permitNumber: 'PTW-2025-002',
    status: 'submitted',
    permitType: { id: 'pt2', name: 'Confined Space', icon: '🏗️' },
    site: { id: 's1', name: 'Site A' },
    location: 'Tank Farm',
    startTime: new Date(Date.now() + 7200000).toISOString(),
    endTime: new Date(Date.now() + 14400000).toISOString(),
    requestedBy: { fullName: 'Jane Smith' }
  }
];

describe('PermitBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url) => {
      if (url === '/permits/board' || url.startsWith('/permits/board?')) {
        return Promise.resolve({
          data: {
            permits: mockPermits
          }
        });
      }
      if (url === '/sites') {
        return Promise.resolve({ data: { sites: [{ id: 's1', name: 'Site A' }] } });
      }
      if (url === '/permit-types') {
        return Promise.resolve({
          data: {
            permitTypes: [
              { id: 'pt1', name: 'Hot Work', icon: '🔥' },
              { id: 'pt2', name: 'Confined Space', icon: '🏗️' }
            ]
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders permit board title (TC-P7-PERM-01)', async () => {
    render(
      <MemoryRouter>
        <PermitBoardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/permit board/i)).toBeInTheDocument();
    });
  });

  it('displays active permits section (TC-P7-PERM-01)', async () => {
    render(
      <MemoryRouter>
        <PermitBoardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/active permits/i)).toBeInTheDocument();
    });
  });

  it('displays pending approval section when permits are pending (TC-P7-PERM-01)', async () => {
    render(
      <MemoryRouter>
        <PermitBoardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/pending approval/i)).toBeInTheDocument();
    });
  });

  it('shows permit numbers (TC-P7-PERM-02)', async () => {
    render(
      <MemoryRouter>
        <PermitBoardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/PTW-2025-001/)).toBeInTheDocument();
      expect(screen.getByText(/PTW-2025-002/)).toBeInTheDocument();
    });
  });

  it('has New Permit button (TC-P7-PERM-03)', async () => {
    render(
      <MemoryRouter>
        <PermitBoardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new permit/i })).toBeInTheDocument();
    });
  });

  it('has auto-refresh toggle (TC-P7-PERM-04)', async () => {
    render(
      <MemoryRouter>
        <PermitBoardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/auto-refresh/i)).toBeInTheDocument();
    });
  });

  it('has site filter dropdown (TC-P7-PERM-02)', async () => {
    render(
      <MemoryRouter>
        <PermitBoardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/all sites/i)).toBeInTheDocument();
    });
  });

  it('has type filter dropdown (TC-P7-PERM-02)', async () => {
    render(
      <MemoryRouter>
        <PermitBoardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/all types/i)).toBeInTheDocument();
    });
  });
});
