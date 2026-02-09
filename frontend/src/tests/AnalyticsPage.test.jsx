import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock AuthContext
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Manager User', role: 'manager' }
  })
}));

// Mock AnalyticsContext with controlled data
const mockAnalyticsContext = {
  filters: {},
  summary: {
    kpis: {
      totalIncidents: { value: 42, trend: 12.5, trendDirection: 'up' },
      highSeverityPercent: { value: 15, trend: -5.2, trendDirection: 'down' },
      avgResolutionDays: { value: 4.5, trend: -10, trendDirection: 'down' },
      openActions: { value: 18, trend: 8, trendDirection: 'up' },
      inspectionPassRate: { value: 87, trend: 2.5, trendDirection: 'up' }
    }
  },
  incidentTimeSeries: [],
  incidentsBySite: [],
  incidentsByType: [],
  inspectionsTimeSeries: [],
  actionsTimeSeries: [],
  topRiskSites: [],
  savedViews: [],
  activeViewId: null,
  loading: false,
  error: null,
  setFilters: vi.fn(),
  loadView: vi.fn(),
  saveView: vi.fn(),
  updateView: vi.fn(),
  deleteView: vi.fn(),
  clearFilters: vi.fn(),
  refreshData: vi.fn()
};

vi.mock('../context/AnalyticsContext', () => ({
  AnalyticsProvider: ({ children }) => children,
  useAnalytics: () => mockAnalyticsContext
}));

// Mock API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} }))
  }
}));

import AnalyticsPage from '../pages/AnalyticsPage';

const renderPage = () => {
  return render(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>
  );
};

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    // Reset context values
    mockAnalyticsContext.loading = false;
    mockAnalyticsContext.error = null;
  });

  describe('Page Structure', () => {
    it('renders analytics page header', () => {
      renderPage();
      expect(screen.getByText('Analytics & Insights')).toBeInTheDocument();
    });

    it('renders KPI cards section', () => {
      renderPage();
      expect(screen.getByText('Total Incidents')).toBeInTheDocument();
      expect(screen.getByText('% High Severity')).toBeInTheDocument();
      expect(screen.getByText('Open Actions')).toBeInTheDocument();
      expect(screen.getByText('Pass Rate')).toBeInTheDocument();
    });

    it('renders filter panel', () => {
      renderPage();
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('renders charts section', () => {
      renderPage();
      expect(screen.getByText('Incidents Over Time')).toBeInTheDocument();
    });

    it('renders risk widget section', () => {
      renderPage();
      expect(screen.getByText('Top 5 High-Risk Sites')).toBeInTheDocument();
    });
  });

  describe('Filter Panel', () => {
    it('displays filter panel with date range options', () => {
      renderPage();
      expect(screen.getByText('Date Range')).toBeInTheDocument();
    });

    it('displays site filter options', () => {
      renderPage();
      expect(screen.getByText('Sites')).toBeInTheDocument();
    });

    it('displays severity filter options', () => {
      renderPage();
      expect(screen.getByText('Severity')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error state when error exists', () => {
      mockAnalyticsContext.error = 'Failed to load analytics data';
      renderPage();
      expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
    });

    it('shows retry button on error', () => {
      mockAnalyticsContext.error = 'Network error';
      renderPage();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('passes loading state to KPI cards', () => {
      mockAnalyticsContext.loading = true;
      renderPage();

      // When loading, cards show skeleton
      const skeletons = document.querySelectorAll('.kpi-card-loading');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Saved Views', () => {
    it('renders saved views dropdown', () => {
      renderPage();
      expect(screen.getByText('Saved Views')).toBeInTheDocument();
    });
  });
});
