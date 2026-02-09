import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import IncidentNewPage from '../pages/IncidentNewPage';

// TC-INC-01, TC-INC-02 (frontend validation + submit)

const mockGet = vi.fn();
const mockPost = vi.fn();

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
    useNavigate: () => vi.fn()
  };
});

describe('IncidentNewPage', () => {
  beforeEach(() => {
    mockGet.mockResolvedValueOnce({ data: { sites: [{ id: 's1', name: 'Site A' }] } });
    mockGet.mockResolvedValueOnce({ data: { incidentTypes: [{ id: 't1', name: 'Injury' }] } });
  });

  it('shows validation error when required fields are missing (TC-INC-02)', async () => {
    render(
      <MemoryRouter>
        <IncidentNewPage />
      </MemoryRouter>
    );

    await screen.findByText(/new incident/i);
    fireEvent.click(screen.getByRole('button', { name: /create incident/i }));

    expect(await screen.findByText(/required fields/i)).toBeInTheDocument();
  });

  it('submits incident when fields are filled (TC-INC-01)', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 'inc-1' } });

    render(
      <MemoryRouter>
        <IncidentNewPage />
      </MemoryRouter>
    );

    await screen.findByText(/new incident/i);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test Incident' } });
    fireEvent.change(screen.getByLabelText(/incident type/i), { target: { value: 't1' } });
    fireEvent.change(screen.getByLabelText(/site/i), { target: { value: 's1' } });
    fireEvent.change(screen.getByLabelText(/severity/i), { target: { value: 'medium' } });
    fireEvent.change(screen.getByLabelText(/date & time/i), { target: { value: '2025-01-10T12:00' } });

    fireEvent.click(screen.getByRole('button', { name: /create incident/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });
  });
});
