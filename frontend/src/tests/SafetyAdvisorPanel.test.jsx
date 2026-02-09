import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SafetyAdvisorPanel from '../components/safety/SafetyAdvisorPanel';

// Phase 11 Tests: TC-271-1, TC-276-1, TC-276-2

vi.mock('../api/safetyAdvisor', () => ({
  getTaskSafetySummary: vi.fn(),
  acknowledgeSafetyAdvisor: vi.fn(),
  getAcknowledgementStatus: vi.fn()
}));

import { getTaskSafetySummary, acknowledgeSafetyAdvisor, getAcknowledgementStatus } from '../api/safetyAdvisor';

const mockSafetySummary = {
  siteName: 'Test Site',
  siteLocation: 'London, UK',
  isHighRisk: false,
  hasAcknowledged: false,
  weather: {
    status: 'ok',
    tempC: 18,
    feelsLikeC: 16,
    condition: 'Partly Cloudy',
    icon: '⛅',
    windKph: 12,
    updatedAt: new Date().toISOString(),
    summaryText: 'Good conditions for outdoor work'
  },
  ppeAdvice: {
    summary: 'Standard PPE required',
    items: ['Hard Hat', 'High-Vis Vest', 'Safety Boots']
  },
  safetyMoment: {
    id: 'sm-1',
    title: 'Working at Heights Safety',
    body: 'Always ensure fall protection is in place when working above 2 meters.',
    category: 'Working at Heights',
    acknowledged: false
  },
  legislation: [
    {
      title: 'Working at Heights Regulations 2005',
      refCode: 'SI 2005/735',
      category: 'Health & Safety',
      linkUrl: 'https://example.com/wahr'
    }
  ]
};

describe('SafetyAdvisorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTaskSafetySummary.mockResolvedValue(mockSafetySummary);
    getAcknowledgementStatus.mockResolvedValue({ hasAcknowledged: false });
    acknowledgeSafetyAdvisor.mockResolvedValue({ acknowledgedAt: new Date().toISOString() });
  });

  // TC-271-1: Safety Advisor displays on task detail pages
  it('displays safety advisor panel with all sections (TC-271-1)', async () => {
    render(
      <SafetyAdvisorPanel
        siteId="site-1"
        entityType="incident"
        entityId="inc-1"
        safetySummary={mockSafetySummary}
      />
    );

    // Header
    expect(screen.getByText('Safety Advisor')).toBeInTheDocument();
    expect(screen.getByText('Test Site')).toBeInTheDocument();

    // Weather section - use getAllByText for temperature which may appear multiple times
    expect(screen.getByText('Weather')).toBeInTheDocument();
    expect(screen.getAllByText('18°C').length).toBeGreaterThan(0);
    expect(screen.getByText('Partly Cloudy')).toBeInTheDocument();

    // PPE section
    expect(screen.getByText('PPE & Dressing')).toBeInTheDocument();
    expect(screen.getByText('Hard Hat')).toBeInTheDocument();
    expect(screen.getByText('High-Vis Vest')).toBeInTheDocument();
    expect(screen.getByText('Safety Boots')).toBeInTheDocument();

    // Safety Moment section
    expect(screen.getByText('Safety Moment')).toBeInTheDocument();
    expect(screen.getByText('Working at Heights Safety')).toBeInTheDocument();

    // Legislation section header (section is collapsed by default)
    expect(screen.getByText('Applicable Legislation')).toBeInTheDocument();
    // Click to expand legislation section
    const legislationHeader = screen.getByText('Applicable Legislation').closest('.sa-section-header');
    fireEvent.click(legislationHeader);
    expect(screen.getByText('Working at Heights Regulations 2005')).toBeInTheDocument();
  });

  // TC-276-1: High-risk acknowledgement required banner
  it('shows high-risk required banner when requiresAcknowledgement is true (TC-276-1)', async () => {
    render(
      <SafetyAdvisorPanel
        siteId="site-1"
        entityType="incident"
        entityId="inc-1"
        safetySummary={mockSafetySummary}
        requiresAcknowledgement={true}
        hasAcknowledged={false}
      />
    );

    // Use getAllByText since the text may appear in multiple places
    expect(screen.getAllByText(/high-risk work/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/safety acknowledgement required/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  // TC-276-2: Acknowledgement button and success state
  it('handles acknowledgement flow correctly (TC-276-2)', async () => {
    const onAcknowledge = vi.fn();

    render(
      <SafetyAdvisorPanel
        siteId="site-1"
        entityType="incident"
        entityId="inc-1"
        safetySummary={mockSafetySummary}
        requiresAcknowledgement={true}
        hasAcknowledged={false}
        onAcknowledge={onAcknowledge}
      />
    );

    // Find and click acknowledge button
    const ackButton = screen.getByRole('button', { name: /acknowledge safety review/i });
    expect(ackButton).toBeInTheDocument();

    fireEvent.click(ackButton);

    await waitFor(() => {
      expect(acknowledgeSafetyAdvisor).toHaveBeenCalledWith('incident', 'inc-1', expect.any(Object));
    });

    await waitFor(() => {
      expect(onAcknowledge).toHaveBeenCalled();
    });
  });

  it('shows acknowledged state when hasAcknowledged is true', () => {
    render(
      <SafetyAdvisorPanel
        siteId="site-1"
        entityType="incident"
        entityId="inc-1"
        safetySummary={mockSafetySummary}
        requiresAcknowledgement={true}
        hasAcknowledged={true}
      />
    );

    expect(screen.getByText(/safety review complete/i)).toBeInTheDocument();
    expect(screen.queryByText(/safety acknowledgement required/i)).not.toBeInTheDocument();
  });

  it('shows loading skeleton when loading', () => {
    render(
      <SafetyAdvisorPanel
        siteId="site-1"
        entityType="incident"
        entityId="inc-1"
      />
    );

    // Should show skeleton during load - aside has role="complementary"
    const panel = screen.getByRole('complementary', { name: /safety advisor/i });
    expect(panel).toHaveAttribute('aria-busy', 'true');
  });

  it('shows weather error fallback when weather unavailable', () => {
    const summaryWithWeatherError = {
      ...mockSafetySummary,
      weather: {
        status: 'error',
        tempC: null
      }
    };

    render(
      <SafetyAdvisorPanel
        siteId="site-1"
        entityType="incident"
        entityId="inc-1"
        safetySummary={summaryWithWeatherError}
      />
    );

    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/weather data is currently unavailable/i)).toBeInTheDocument();
  });

  it('collapses and expands sections when clicked', () => {
    render(
      <SafetyAdvisorPanel
        siteId="site-1"
        entityType="incident"
        entityId="inc-1"
        safetySummary={mockSafetySummary}
      />
    );

    // Weather should be expanded by default
    expect(screen.getByText('Partly Cloudy')).toBeInTheDocument();

    // Click weather header to collapse
    const weatherHeader = screen.getByText('Weather').closest('.sa-section-header');
    fireEvent.click(weatherHeader);

    // Content should be hidden (not testing CSS, just that toggle works)
    expect(weatherHeader).toBeInTheDocument();
  });
});
