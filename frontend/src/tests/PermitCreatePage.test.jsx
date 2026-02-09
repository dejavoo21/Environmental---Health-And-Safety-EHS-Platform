import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import PermitCreatePage from '../pages/PermitCreatePage';

// TC-P7-PERM-05, TC-P7-PERM-06 (frontend permit creation wizard tests)

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../api/client', () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args)
  }
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const mockPermitTypes = [
  {
    id: 'pt1',
    name: 'Hot Work',
    icon: '🔥',
    description: 'For welding, cutting, and grinding',
    validityHours: 8,
    requiredControls: [
      { id: 'ctrl1', description: 'Fire extinguisher nearby', phase: 'pre_work', required: true },
      { id: 'ctrl2', description: 'Area cleared of flammables', phase: 'pre_work', required: true }
    ]
  },
  {
    id: 'pt2',
    name: 'Confined Space',
    icon: '🏗️',
    description: 'For entering tanks, vessels, pits',
    validityHours: 4,
    requiredControls: [
      { id: 'ctrl3', description: 'Gas test completed', phase: 'pre_work', required: true }
    ]
  }
];

describe('PermitCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url) => {
      if (url === '/permit-types') {
        return Promise.resolve({ data: { permitTypes: mockPermitTypes } });
      }
      if (url === '/sites') {
        return Promise.resolve({
          data: { sites: [{ id: 's1', name: 'Site A' }, { id: 's2', name: 'Site B' }] }
        });
      }
      if (url === '/users' || url.startsWith('/users?')) {
        return Promise.resolve({
          data: { users: [{ id: 'u1', fullName: 'John Doe' }, { id: 'u2', fullName: 'Jane Smith' }] }
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders permit create page with step indicator (TC-P7-PERM-05)', async () => {
    render(
      <MemoryRouter>
        <PermitCreatePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/new permit/i)).toBeInTheDocument();
      expect(screen.getByText(/select type/i)).toBeInTheDocument();
    });
  });

  it('shows permit type selection cards (TC-P7-PERM-05)', async () => {
    render(
      <MemoryRouter>
        <PermitCreatePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hot Work')).toBeInTheDocument();
      expect(screen.getByText('Confined Space')).toBeInTheDocument();
    });
  });

  it('enables Next button when permit type is selected (TC-P7-PERM-05)', async () => {
    render(
      <MemoryRouter>
        <PermitCreatePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hot Work')).toBeInTheDocument();
    });

    // Click on Hot Work permit type
    fireEvent.click(screen.getByText('Hot Work'));

    // Next button should now be clickable
    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).not.toBeDisabled();
  });

  it('advances to step 2 when Next is clicked (TC-P7-PERM-05)', async () => {
    render(
      <MemoryRouter>
        <PermitCreatePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hot Work')).toBeInTheDocument();
    });

    // Select permit type
    fireEvent.click(screen.getByText('Hot Work'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Should now show step 2 - check for step-specific content
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /details & schedule/i })).toBeInTheDocument();
    });
  });

  it('shows Back button on step 2 (TC-P7-PERM-05)', async () => {
    render(
      <MemoryRouter>
        <PermitCreatePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hot Work')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Hot Work'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      // May have multiple Back buttons (step nav + form nav), check at least one exists
      const backButtons = screen.getAllByRole('button', { name: /back/i });
      expect(backButtons.length).toBeGreaterThan(0);
    });
  });

  it('shows site dropdown on step 2 (TC-P7-PERM-06)', async () => {
    render(
      <MemoryRouter>
        <PermitCreatePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hot Work')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Hot Work'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/site/i)).toBeInTheDocument();
    });
  });

  it('has work description textarea on step 2 (TC-P7-PERM-06)', async () => {
    render(
      <MemoryRouter>
        <PermitCreatePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hot Work')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Hot Work'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/describe the work/i)).toBeInTheDocument();
    });
  });

  it('has start and end time inputs on step 2 (TC-P7-PERM-06)', async () => {
    render(
      <MemoryRouter>
        <PermitCreatePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hot Work')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Hot Work'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
    });
  });

  it('has Add button for adding workers (TC-P7-PERM-06)', async () => {
    render(
      <MemoryRouter>
        <PermitCreatePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hot Work')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Hot Work'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    });
  });
});
