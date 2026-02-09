import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import HelpPage from '../pages/HelpPage';

// TC-HELP-01, TC-HELP-02, TC-HELP-03: Help page tests

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn()
  }
}));

import api from '../api/client';

const mockTopics = [
  { id: '1', slug: 'incidents', title: 'Reporting Incidents', summary: 'How to report safety incidents' },
  { id: '2', slug: 'inspections', title: 'Inspections', summary: 'How inspections work' }
];

describe('HelpPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays help topics list (TC-HELP-01)', async () => {
    api.get.mockResolvedValueOnce({ data: { topics: mockTopics } });

    render(<HelpPage />);

    await waitFor(() => {
      expect(screen.getByText('Reporting Incidents')).toBeInTheDocument();
    });

    expect(screen.getByText('Inspections')).toBeInTheDocument();
  });

  it('shows welcome message initially (TC-HELP-02)', async () => {
    api.get.mockResolvedValueOnce({ data: { topics: mockTopics } });

    render(<HelpPage />);

    await waitFor(() => {
      expect(screen.getByText(/welcome to help/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/select a topic/i)).toBeInTheDocument();
  });

  it('loads topic content when clicked (TC-HELP-03)', async () => {
    api.get.mockResolvedValueOnce({ data: { topics: mockTopics } });
    api.get.mockResolvedValueOnce({
      data: {
        title: 'Reporting Incidents',
        content: '# How to Report\n\nFollow these steps to report an incident.'
      }
    });

    render(<HelpPage />);

    await waitFor(() => {
      expect(screen.getByText('Reporting Incidents')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Reporting Incidents'));

    await waitFor(() => {
      expect(screen.getByText(/how to report/i)).toBeInTheDocument();
    });
  });

  it('shows support contact info (TC-HELP-04)', async () => {
    api.get.mockResolvedValueOnce({ data: { topics: mockTopics } });

    render(<HelpPage />);

    await waitFor(() => {
      expect(screen.getByText(/need more help/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/support@company.com/i)).toBeInTheDocument();
  });

  it('shows error when topics fail to load (TC-HELP-05)', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 500 } });

    render(<HelpPage />);

    await waitFor(() => {
      expect(screen.getByText(/unable to load/i)).toBeInTheDocument();
    });
  });
});
