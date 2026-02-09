import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import InspectionNewPage from '../pages/InspectionNewPage';

// TC-INSP-04, TC-INSP-05 (frontend validation + submit)

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
    user: { id: '1', role: 'manager', firstName: 'Test', lastName: 'User' }
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

describe('InspectionNewPage', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockGet.mockResolvedValueOnce({ data: { sites: [{ id: 's1', name: 'Site A' }] } });
    mockGet.mockResolvedValueOnce({ data: { templates: [{ id: 't1', name: 'Template A' }] } });
    mockGet.mockResolvedValueOnce({ data: { id: 't1', name: 'Template A', items: [{ id: 'i1', label: 'Item 1', category: 'Cat', sortOrder: 1 }] } });
  });

  it('shows validation error when required fields are missing (TC-INSP-04)', async () => {
    render(
      <MemoryRouter>
        <InspectionNewPage />
      </MemoryRouter>
    );

    await screen.findByText(/new inspection/i);
    fireEvent.click(screen.getByRole('button', { name: /submit inspection/i }));
    expect(await screen.findByText(/required/i)).toBeInTheDocument();
  });

  it('submits inspection with checklist responses (TC-INSP-05)', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 'insp-1' } });

    render(
      <MemoryRouter>
        <InspectionNewPage />
      </MemoryRouter>
    );

    await screen.findByText(/new inspection/i);

    fireEvent.change(screen.getByLabelText(/site/i), { target: { value: 's1' } });
    fireEvent.change(screen.getByLabelText(/template/i), { target: { value: 't1' } });
    fireEvent.change(screen.getByLabelText(/performed at/i), { target: { value: '2025-01-10T12:00' } });

    await screen.findByText(/checklist items/i);
    await screen.findByText(/item 1/i);

    fireEvent.click(screen.getByRole('button', { name: /submit inspection/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });
  });
});
