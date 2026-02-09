import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import AdminSafetyMomentsPage from '../pages/AdminSafetyMomentsPage';

// Phase 11 Tests: TC-270-1 (Admin CRUD)

vi.mock('../api/safetyAdvisor', () => ({
  getSafetyMoments: vi.fn(),
  createSafetyMoment: vi.fn(),
  updateSafetyMoment: vi.fn(),
  archiveSafetyMoment: vi.fn(),
  getSafetyMomentAnalytics: vi.fn()
}));

import {
  getSafetyMoments,
  createSafetyMoment,
  updateSafetyMoment,
  archiveSafetyMoment,
  getSafetyMomentAnalytics
} from '../api/safetyAdvisor';

const mockMoments = [
  {
    id: 'sm-1',
    title: 'Fire Safety Awareness',
    body: 'Know your nearest fire exit.',
    category: 'Fire Safety',
    scheduledDate: '2025-01-15',
    isActive: true,
    acknowledgementCount: 45
  },
  {
    id: 'sm-2',
    title: 'PPE Requirements',
    body: 'Always wear appropriate PPE.',
    category: 'PPE',
    scheduledDate: '2025-01-16',
    isActive: true,
    acknowledgementCount: 32
  }
];

const mockAnalytics = {
  totalMoments: 25,
  totalAcknowledgements: 500,
  avgAckRate: 78,
  scheduledCount: 5
};

describe('AdminSafetyMomentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSafetyMoments.mockResolvedValue({ moments: mockMoments });
    getSafetyMomentAnalytics.mockResolvedValue(mockAnalytics);
    createSafetyMoment.mockResolvedValue({ id: 'sm-new', title: 'New Moment' });
    updateSafetyMoment.mockResolvedValue({ id: 'sm-1', title: 'Updated' });
    archiveSafetyMoment.mockResolvedValue({ success: true });
  });

  it('displays safety moments list (TC-270-1)', async () => {
    render(<AdminSafetyMomentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Fire Safety Awareness')).toBeInTheDocument();
    });

    expect(screen.getByText('PPE Requirements')).toBeInTheDocument();
    expect(screen.getByText('Fire Safety')).toBeInTheDocument();
    expect(screen.getByText('PPE')).toBeInTheDocument();
  });

  it('displays analytics summary', async () => {
    render(<AdminSafetyMomentsPage />);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // Total moments
    });

    expect(screen.getByText('500')).toBeInTheDocument(); // Total acks
    expect(screen.getByText('78%')).toBeInTheDocument(); // Avg rate
    expect(screen.getByText('5')).toBeInTheDocument(); // Scheduled
  });

  it('opens form when Add button clicked', async () => {
    render(<AdminSafetyMomentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Fire Safety Awareness')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add safety moment/i });
    fireEvent.click(addButton);

    expect(screen.getByText('New Safety Moment')).toBeInTheDocument();
    expect(screen.getByText('Title *')).toBeInTheDocument();
    expect(screen.getByText('Body *')).toBeInTheDocument();
  });

  it('creates new safety moment', async () => {
    render(<AdminSafetyMomentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Fire Safety Awareness')).toBeInTheDocument();
    });

    // Open form
    fireEvent.click(screen.getByRole('button', { name: /add safety moment/i }));

    // Fill form using placeholder text to find inputs
    fireEvent.change(screen.getByPlaceholderText(/enter a concise title/i), {
      target: { value: 'New Safety Topic' }
    });
    fireEvent.change(screen.getByPlaceholderText(/write the safety moment content/i), {
      target: { value: 'This is the safety moment content.' }
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /create moment/i }));

    await waitFor(() => {
      expect(createSafetyMoment).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Safety Topic',
          body: 'This is the safety moment content.'
        })
      );
    });
  });

  it('opens edit form when Edit clicked', async () => {
    render(<AdminSafetyMomentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Fire Safety Awareness')).toBeInTheDocument();
    });

    // Find first edit button
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Edit Safety Moment')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fire Safety Awareness')).toBeInTheDocument();
  });

  it('archives safety moment', async () => {
    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AdminSafetyMomentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Fire Safety Awareness')).toBeInTheDocument();
    });

    // Find first archive button (filter out the 'Archived' tab button)
    const archiveButtons = screen.getAllByRole('button', { name: /^archive$/i });
    fireEvent.click(archiveButtons[0]);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(archiveSafetyMoment).toHaveBeenCalledWith('sm-1');
    });

    confirmSpy.mockRestore();
  });

  it('filters by status', async () => {
    render(<AdminSafetyMomentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Fire Safety Awareness')).toBeInTheDocument();
    });

    // Initial call should be with 'active' filter
    expect(getSafetyMoments).toHaveBeenCalledWith({ status: 'active' });

    // Click scheduled filter
    const scheduledTab = screen.getByRole('button', { name: /^scheduled$/i });
    fireEvent.click(scheduledTab);

    await waitFor(() => {
      expect(getSafetyMoments).toHaveBeenCalledWith({ status: 'scheduled' });
    });
  });

  it('shows validation error for empty form', async () => {
    render(<AdminSafetyMomentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Fire Safety Awareness')).toBeInTheDocument();
    });

    // Open form
    fireEvent.click(screen.getByRole('button', { name: /add safety moment/i }));

    // Submit without filling
    fireEvent.click(screen.getByRole('button', { name: /create moment/i }));

    await waitFor(() => {
      expect(screen.getByText(/title and body are required/i)).toBeInTheDocument();
    });
  });
});
