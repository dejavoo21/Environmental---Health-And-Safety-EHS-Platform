import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import DashboardSafetyMomentCard from '../components/safety/DashboardSafetyMomentCard';

// Phase 11 Tests: TC-270-1, TC-270-2

vi.mock('../api/safetyAdvisor', () => ({
  acknowledgeSafetyAdvisor: vi.fn()
}));

import { acknowledgeSafetyAdvisor } from '../api/safetyAdvisor';

const mockSafetyMoment = {
  id: 'sm-123',
  title: 'Fire Safety Awareness',
  body: 'Know your nearest fire exit and assembly point. In case of fire, raise the alarm immediately and evacuate using the nearest safe route. Never use elevators during a fire emergency.',
  category: 'Fire Safety',
  acknowledged: false,
  acknowledgementCount: 42
};

describe('DashboardSafetyMomentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acknowledgeSafetyAdvisor.mockResolvedValue({ acknowledgedAt: new Date().toISOString() });
  });

  // TC-270-1: Safety Moment displays on dashboard
  it('displays safety moment content (TC-270-1)', () => {
    render(
      <DashboardSafetyMomentCard
        safetyMoment={mockSafetyMoment}
        siteId="site-1"
      />
    );

    expect(screen.getByText("Today's Safety Moment")).toBeInTheDocument();
    expect(screen.getByText('Fire Safety Awareness')).toBeInTheDocument();
    expect(screen.getByText(/know your nearest fire exit/i)).toBeInTheDocument();
    expect(screen.getByText('Fire Safety')).toBeInTheDocument();
  });

  // TC-270-2: Safety Moment acknowledgement
  it('handles acknowledgement correctly (TC-270-2)', async () => {
    const onAcknowledge = vi.fn();

    render(
      <DashboardSafetyMomentCard
        safetyMoment={mockSafetyMoment}
        siteId="site-1"
        onAcknowledge={onAcknowledge}
      />
    );

    // Find acknowledge button
    const ackButton = screen.getByRole('button', { name: /acknowledge/i });
    expect(ackButton).toBeInTheDocument();

    fireEvent.click(ackButton);

    await waitFor(() => {
      expect(acknowledgeSafetyAdvisor).toHaveBeenCalledWith(
        'safety-moment',
        'sm-123',
        expect.objectContaining({
          siteId: 'site-1',
          channel: 'dashboard'
        })
      );
    });

    await waitFor(() => {
      expect(onAcknowledge).toHaveBeenCalled();
    });
  });

  it('shows acknowledged state when already acknowledged', () => {
    const acknowledgedMoment = {
      ...mockSafetyMoment,
      acknowledged: true
    };

    render(
      <DashboardSafetyMomentCard
        safetyMoment={acknowledgedMoment}
        siteId="site-1"
      />
    );

    expect(screen.getByText(/acknowledged/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
  });

  it('shows empty state when safetyMoment is undefined', () => {
    render(
      <DashboardSafetyMomentCard
        safetyMoment={undefined}
        siteId="site-1"
      />
    );

    expect(screen.getByText("Today's Safety Moment")).toBeInTheDocument();
    // Should show empty state message
    expect(screen.getByText(/no safety moment configured/i)).toBeInTheDocument();
  });

  it('shows empty state when no safety moment', () => {
    render(
      <DashboardSafetyMomentCard
        safetyMoment={null}
        siteId="site-1"
      />
    );

    expect(screen.getByText(/no safety moment/i)).toBeInTheDocument();
  });

  it('truncates long body text with Read more link', () => {
    const longMoment = {
      ...mockSafetyMoment,
      body: 'A'.repeat(300) // Very long body
    };

    render(
      <DashboardSafetyMomentCard
        safetyMoment={longMoment}
        siteId="site-1"
      />
    );

    expect(screen.getByText(/read more/i)).toBeInTheDocument();
  });
});
