import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import PreTaskSafetyAdvisor from '../components/safety/PreTaskSafetyAdvisor';

// Phase 11 Tests: TC-275-1, TC-276-3

vi.mock('../api/safetyAdvisor', () => ({
  getTaskSafetySummary: vi.fn(),
  acknowledgeSafetyAdvisor: vi.fn()
}));

import { getTaskSafetySummary, acknowledgeSafetyAdvisor } from '../api/safetyAdvisor';

const mockSafetySummary = {
  siteName: 'Construction Site A',
  isHighRisk: false,
  hasAcknowledged: false,
  weather: {
    status: 'ok',
    tempC: 22,
    condition: 'Sunny',
    icon: '☀️'
  },
  ppeAdvice: {
    summary: 'Standard PPE required',
    items: ['Hard Hat', 'Safety Boots', 'High-Vis Vest']
  },
  safetyMoment: {
    id: 'sm-1',
    title: 'Manual Handling Safety',
    body: 'Always bend your knees when lifting heavy objects.',
    category: 'Manual Handling'
  }
};

describe('PreTaskSafetyAdvisor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTaskSafetySummary.mockResolvedValue(mockSafetySummary);
    acknowledgeSafetyAdvisor.mockResolvedValue({ acknowledgedAt: new Date().toISOString() });
  });

  // TC-275-1: Pre-task safety view for My Actions
  it('displays pre-task safety overview in compact mode (TC-275-1)', async () => {
    render(
      <PreTaskSafetyAdvisor
        siteId="site-1"
        entityType="action"
        entityId="action-1"
        safetySummary={mockSafetySummary}
      />
    );

    // Header
    expect(screen.getByText('Pre-Task Safety Review')).toBeInTheDocument();

    // Weather quick info
    expect(screen.getByText('22°C')).toBeInTheDocument();
    expect(screen.getByText('Sunny')).toBeInTheDocument();

    // PPE count
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('PPE required')).toBeInTheDocument();

    // Safety moment indicator
    expect(screen.getByText("Today's Moment")).toBeInTheDocument();
    expect(screen.getByText('Manual Handling')).toBeInTheDocument();

    // Acknowledge button
    expect(screen.getByRole('button', { name: /acknowledge/i })).toBeInTheDocument();
  });

  // TC-276-3: High-risk pre-task acknowledgement
  it('shows high-risk warning when requiresAcknowledgement is true (TC-276-3)', async () => {
    render(
      <PreTaskSafetyAdvisor
        siteId="site-1"
        entityType="action"
        entityId="action-1"
        safetySummary={{ ...mockSafetySummary, isHighRisk: true }}
        requiresAcknowledgement={true}
      />
    );

    expect(screen.getByText(/high-risk work/i)).toBeInTheDocument();
    expect(screen.getByText(/review required before starting/i)).toBeInTheDocument();
  });

  it('requires safety moment checkbox before acknowledgement', async () => {
    render(
      <PreTaskSafetyAdvisor
        siteId="site-1"
        entityType="action"
        entityId="action-1"
        safetySummary={mockSafetySummary}
      />
    );

    // Button should be disabled without checkbox
    const ackButton = screen.getByRole('button', { name: /acknowledge/i });
    expect(ackButton).toBeDisabled();

    // Check the safety moment checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Button should now be enabled
    expect(ackButton).not.toBeDisabled();
  });

  it('handles acknowledgement flow correctly', async () => {
    const onAcknowledge = vi.fn();

    render(
      <PreTaskSafetyAdvisor
        siteId="site-1"
        entityType="action"
        entityId="action-1"
        safetySummary={mockSafetySummary}
        onAcknowledge={onAcknowledge}
      />
    );

    // Check the safety moment checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Click acknowledge
    const ackButton = screen.getByRole('button', { name: /acknowledge/i });
    fireEvent.click(ackButton);

    await waitFor(() => {
      expect(acknowledgeSafetyAdvisor).toHaveBeenCalledWith(
        'action',
        'action-1',
        expect.objectContaining({ channel: 'pre-task' })
      );
    });

    await waitFor(() => {
      expect(onAcknowledge).toHaveBeenCalled();
    });
  });

  it('shows acknowledged success state', () => {
    render(
      <PreTaskSafetyAdvisor
        siteId="site-1"
        entityType="action"
        entityId="action-1"
        safetySummary={{ ...mockSafetySummary, hasAcknowledged: true }}
      />
    );

    expect(screen.getByText('Safety Review Complete')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
  });

  it('expands to full view when View Details clicked', async () => {
    render(
      <PreTaskSafetyAdvisor
        siteId="site-1"
        entityType="action"
        entityId="action-1"
        safetySummary={mockSafetySummary}
        mode="compact"
      />
    );

    // Click View Details
    const viewDetailsBtn = screen.getByRole('button', { name: /view details/i });
    fireEvent.click(viewDetailsBtn);

    // Should now show full SafetyAdvisorPanel
    await waitFor(() => {
      expect(screen.getByText('Review the safety information below before starting your task.')).toBeInTheDocument();
    });

    // Should have back button
    expect(screen.getByRole('button', { name: /back to summary/i })).toBeInTheDocument();
  });

  it('renders in full mode by default when mode is full', () => {
    render(
      <PreTaskSafetyAdvisor
        siteId="site-1"
        entityType="action"
        entityId="action-1"
        safetySummary={mockSafetySummary}
        mode="full"
      />
    );

    expect(screen.getByText('Review the safety information below before starting your task.')).toBeInTheDocument();
  });
});
