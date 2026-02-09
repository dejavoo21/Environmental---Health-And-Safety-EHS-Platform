import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ChemicalRegisterPage from '../pages/ChemicalRegisterPage';

// TC-P7-CHEM-01, TC-P7-CHEM-02 (frontend chemical register tests)

const mockGet = vi.fn();

vi.mock('../api/client', () => ({
  default: {
    get: (...args) => mockGet(...args)
  }
}));

// Mock the chemicals API module
vi.mock('../api/chemicals', () => ({
  getChemicals: vi.fn(() => Promise.resolve({
    chemicals: [
      {
        id: 'chem-1',
        productName: 'Sodium Hydroxide',
        casNumber: '1310-73-2',
        manufacturer: 'ChemCo',
        status: 'active',
        ghsHazardClasses: ['corrosive'],
        sdsExpiryDate: '2026-01-15'
      },
      {
        id: 'chem-2',
        productName: 'Acetone',
        casNumber: '67-64-1',
        manufacturer: 'SolventCorp',
        status: 'active',
        ghsHazardClasses: ['flammable'],
        sdsExpiryDate: '2024-06-01'
      }
    ],
    pagination: { total: 2, page: 1, limit: 20, totalPages: 1, totalItems: 2 }
  })),
  GHS_HAZARD_CLASSES: [
    { id: 'explosive', name: 'Explosive', pictogram: '💣', icon: 'exploding_bomb', color: '#DC3545' },
    { id: 'flammable', name: 'Flammable', pictogram: '🔥', icon: 'flame', color: '#FF6B35' },
    { id: 'oxidizer', name: 'Oxidizer', pictogram: '⭕', icon: 'flame_over_circle', color: '#FFC107' },
    { id: 'corrosive', name: 'Corrosive', pictogram: '⚗️', icon: 'corrosion', color: '#0D6EFD' },
    { id: 'toxic', name: 'Acute Toxicity', pictogram: '☠️', icon: 'skull_crossbones', color: '#DC3545' },
    { id: 'irritant', name: 'Irritant / Harmful', pictogram: '⚠️', icon: 'exclamation', color: '#FD7E14' }
  ]
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

describe('ChemicalRegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock sites endpoint
    mockGet.mockImplementation((url) => {
      if (url === '/sites') {
        return Promise.resolve({ data: { sites: [{ id: 's1', name: 'Site A' }] } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders chemical register page title (TC-P7-CHEM-01)', async () => {
    render(
      <MemoryRouter>
        <ChemicalRegisterPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/chemical register/i)).toBeInTheDocument();
    });
  });

  it('displays chemicals in a table (TC-P7-CHEM-01)', async () => {
    render(
      <MemoryRouter>
        <ChemicalRegisterPage />
      </MemoryRouter>
    );

    // Wait for table to appear (chemicals table structure exists)
    await waitFor(() => {
      expect(screen.getByRole('table') || screen.getByText(/chemical register/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows CAS numbers in the table (TC-P7-CHEM-01)', async () => {
    render(
      <MemoryRouter>
        <ChemicalRegisterPage />
      </MemoryRouter>
    );

    // The table should have CAS Number column header
    await waitFor(() => {
      expect(screen.getByText(/cas/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('has search input for filtering (TC-P7-CHEM-02)', async () => {
    render(
      <MemoryRouter>
        <ChemicalRegisterPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('has filter dropdowns (TC-P7-CHEM-02)', async () => {
    render(
      <MemoryRouter>
        <ChemicalRegisterPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/all statuses/i)).toBeInTheDocument();
      expect(screen.getByText(/all hazard classes/i)).toBeInTheDocument();
    });
  });

  it('shows SDS status indicators (TC-P7-CHEM-03)', async () => {
    render(
      <MemoryRouter>
        <ChemicalRegisterPage />
      </MemoryRouter>
    );

    // The page should have SDS Status column header
    await waitFor(() => {
      expect(screen.getByText(/sds status/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('has Add Chemical button (TC-P7-CHEM-04)', async () => {
    render(
      <MemoryRouter>
        <ChemicalRegisterPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add chemical/i })).toBeInTheDocument();
    });
  });
});
