/**
 * Risk Pages Tests - Phase 9
 * Tests for RisksListPage, RiskDetailPage, RiskNewPage, RiskHeatmapPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../auth/AuthContext';
import RisksListPage from '../../pages/RisksListPage';
import RiskDetailPage from '../../pages/RiskDetailPage';
import RiskNewPage from '../../pages/RiskNewPage';
import RiskHeatmapPage from '../../pages/RiskHeatmapPage';
import * as risksApi from '../../api/risks';

// Mock the risks API
vi.mock('../../api/risks');

// Mock auth context
const mockUser = {
  id: 1,
  email: 'admin@test.com',
  role: 'admin',
  site_id: 1
};

const MockAuthProvider = ({ children, user = mockUser }) => (
  <AuthProvider value={{ user, isAuthenticated: true }}>
    {children}
  </AuthProvider>
);

// Test wrapper
const TestWrapper = ({ children, user = mockUser }) => (
  <MockAuthProvider user={user}>
    <BrowserRouter>{children}</BrowserRouter>
  </MockAuthProvider>
);

// Sample test data
const mockRisks = [
  {
    id: 1,
    reference: 'RSK-001',
    title: 'Chemical Spill Risk',
    description: 'Risk of chemical spill in storage area',
    status: 'active',
    inherent_score: 20,
    inherent_level: 'extreme',
    residual_score: 12,
    residual_level: 'high',
    category_name: 'Operational',
    site_name: 'Main Site',
    next_review_date: '2024-03-01'
  },
  {
    id: 2,
    reference: 'RSK-002',
    title: 'Equipment Failure',
    description: 'Risk of equipment failure',
    status: 'emerging',
    inherent_score: 15,
    inherent_level: 'high',
    residual_score: 9,
    residual_level: 'medium',
    category_name: 'Technical',
    site_name: 'Branch Site',
    next_review_date: '2024-04-01'
  }
];

const mockRiskDetail = {
  id: 1,
  reference: 'RSK-001',
  title: 'Chemical Spill Risk',
  description: 'Risk of chemical spill in storage area',
  status: 'active',
  hazard_type: 'chemical',
  hazard_source: 'Storage tanks',
  potential_consequences: 'Environmental damage, injuries',
  affected_parties: 'Workers, environment',
  inherent_likelihood: 4,
  inherent_impact: 5,
  inherent_score: 20,
  inherent_level: 'extreme',
  inherent_rationale: 'High volume storage',
  residual_likelihood: 3,
  residual_impact: 4,
  residual_score: 12,
  residual_level: 'high',
  residual_rationale: 'Controls in place',
  review_frequency: 'monthly',
  next_review_date: '2024-03-01',
  category_id: 1,
  category_name: 'Operational',
  site_id: 1,
  site_name: 'Main Site',
  owner_id: 1,
  owner_name: 'John Doe',
  created_at: '2024-01-01',
  controls: [
    { id: 1, description: 'Spill containment', type: 'prevention', effectiveness: 'effective' }
  ],
  links: [],
  reviews: []
};

const mockCategories = [
  { id: 1, name: 'Operational' },
  { id: 2, name: 'Environmental' },
  { id: 3, name: 'Technical' }
];

const mockHeatmapData = {
  cells: [
    { likelihood: 5, impact: 5, count: 2, level: 'extreme' },
    { likelihood: 4, impact: 4, count: 3, level: 'high' },
    { likelihood: 3, impact: 3, count: 5, level: 'medium' },
    { likelihood: 2, impact: 2, count: 4, level: 'low' },
    { likelihood: 1, impact: 1, count: 3, level: 'low' }
  ],
  total_risks: 17
};

describe('RisksListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    risksApi.listRisks.mockResolvedValue({
      data: mockRisks,
      meta: { total: 2, page: 1, per_page: 20, total_pages: 1 }
    });
    risksApi.listCategories.mockResolvedValue({ data: mockCategories });
    risksApi.getTopRisks.mockResolvedValue({ data: [mockRisks[0]] });
    risksApi.getUpcomingReviews.mockResolvedValue({ data: [] });
  });

  it('TC-P9-65: renders risk list with data', async () => {
    render(
      <TestWrapper>
        <RisksListPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('RSK-001')).toBeInTheDocument();
      expect(screen.getByText('Chemical Spill Risk')).toBeInTheDocument();
      expect(screen.getByText('RSK-002')).toBeInTheDocument();
      expect(screen.getByText('Equipment Failure')).toBeInTheDocument();
    });
  });

  it('TC-P9-66: displays loading state initially', () => {
    render(
      <TestWrapper>
        <RisksListPage />
      </TestWrapper>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('TC-P9-67: filters by status', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <RisksListPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('RSK-001')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/status/i);
    await user.selectOptions(statusSelect, 'active');

    expect(risksApi.listRisks).toHaveBeenCalledWith(expect.objectContaining({
      status: 'active'
    }));
  });

  it('TC-P9-68: filters by category', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <RisksListPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('RSK-001')).toBeInTheDocument();
    });

    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, '1');

    expect(risksApi.listRisks).toHaveBeenCalledWith(expect.objectContaining({
      category_id: '1'
    }));
  });

  it('TC-P9-69: searches by title', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <RisksListPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('RSK-001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Chemical');

    await waitFor(() => {
      expect(risksApi.listRisks).toHaveBeenCalledWith(expect.objectContaining({
        search: 'Chemical'
      }));
    });
  });

  it('TC-P9-70: navigates to new risk page', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/risks']}>
        <MockAuthProvider>
          <Routes>
            <Route path="/risks" element={<RisksListPage />} />
            <Route path="/risks/new" element={<div>New Risk Page</div>} />
          </Routes>
        </MockAuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('RSK-001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('New Risk'));

    expect(screen.getByText('New Risk Page')).toBeInTheDocument();
  });

  it('TC-P9-71: displays summary cards', async () => {
    render(
      <TestWrapper>
        <RisksListPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Risks')).toBeInTheDocument();
      expect(screen.getByText('Extreme')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });
  });

  it('TC-P9-72: displays top risks in sidebar', async () => {
    render(
      <TestWrapper>
        <RisksListPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Top Risks')).toBeInTheDocument();
    });
  });

  it('TC-P9-73: handles empty state', async () => {
    risksApi.listRisks.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, per_page: 20, total_pages: 0 }
    });

    render(
      <TestWrapper>
        <RisksListPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/no risks found/i)).toBeInTheDocument();
    });
  });
});

describe('RiskDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    risksApi.getRisk.mockResolvedValue({ data: mockRiskDetail });
    risksApi.listControls.mockResolvedValue({ data: mockRiskDetail.controls });
    risksApi.listLinks.mockResolvedValue({ data: [] });
    risksApi.listReviews.mockResolvedValue({ data: [] });
  });

  const renderDetailPage = (id = '1') => {
    return render(
      <MemoryRouter initialEntries={[`/risks/${id}`]}>
        <MockAuthProvider>
          <Routes>
            <Route path="/risks/:id" element={<RiskDetailPage />} />
          </Routes>
        </MockAuthProvider>
      </MemoryRouter>
    );
  };

  it('TC-P9-74: renders risk details', async () => {
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('RSK-001')).toBeInTheDocument();
      expect(screen.getByText('Chemical Spill Risk')).toBeInTheDocument();
    });
  });

  it('TC-P9-75: displays inherent and residual scores', async () => {
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Inherent Risk')).toBeInTheDocument();
      expect(screen.getByText('Residual Risk')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  it('TC-P9-76: shows tabs for different sections', async () => {
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Controls')).toBeInTheDocument();
      expect(screen.getByText('Links')).toBeInTheDocument();
      expect(screen.getByText('Reviews')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
    });
  });

  it('TC-P9-77: switches to Controls tab', async () => {
    const user = userEvent.setup();
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Controls')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Controls'));

    await waitFor(() => {
      expect(screen.getByText('Spill containment')).toBeInTheDocument();
    });
  });

  it('TC-P9-78: shows review button for managers', async () => {
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Record Review')).toBeInTheDocument();
    });
  });

  it('TC-P9-79: shows change status button', async () => {
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Change Status')).toBeInTheDocument();
    });
  });

  it('TC-P9-80: displays hazard information', async () => {
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('Hazard Type:')).toBeInTheDocument();
      expect(screen.getByText('chemical')).toBeInTheDocument();
      expect(screen.getByText('Storage tanks')).toBeInTheDocument();
    });
  });

  it('TC-P9-81: handles error state', async () => {
    risksApi.getRisk.mockRejectedValue(new Error('Risk not found'));

    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});

describe('RiskNewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    risksApi.listCategories.mockResolvedValue({ data: mockCategories });
    risksApi.createRisk.mockResolvedValue({ data: { id: 3, reference: 'RSK-003' } });
  });

  const renderNewPage = () => {
    return render(
      <MemoryRouter initialEntries={['/risks/new']}>
        <MockAuthProvider>
          <Routes>
            <Route path="/risks/new" element={<RiskNewPage />} />
            <Route path="/risks/:id" element={<div>Risk Detail Page</div>} />
          </Routes>
        </MockAuthProvider>
      </MemoryRouter>
    );
  };

  it('TC-P9-82: renders step 1 - Basic Info', async () => {
    renderNewPage();

    await waitFor(() => {
      expect(screen.getByText('Step 1: Basic Information')).toBeInTheDocument();
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
    });
  });

  it('TC-P9-83: validates required fields in step 1', async () => {
    const user = userEvent.setup();
    renderNewPage();

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Next'));

    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('TC-P9-84: advances to step 2', async () => {
    const user = userEvent.setup();
    renderNewPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Title'), 'New Risk');
    await user.type(screen.getByLabelText('Description'), 'Description');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.click(screen.getByText('Next'));

    expect(screen.getByText('Step 2: Hazard Details')).toBeInTheDocument();
  });

  it('TC-P9-85: renders step 2 - Hazard Details', async () => {
    const user = userEvent.setup();
    renderNewPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Title'), 'New Risk');
    await user.type(screen.getByLabelText('Description'), 'Description');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.click(screen.getByText('Next'));

    expect(screen.getByLabelText('Hazard Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Hazard Source')).toBeInTheDocument();
    expect(screen.getByLabelText('Potential Consequences')).toBeInTheDocument();
  });

  it('TC-P9-86: advances to step 3', async () => {
    const user = userEvent.setup();
    renderNewPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
    });

    // Complete step 1
    await user.type(screen.getByLabelText('Title'), 'New Risk');
    await user.type(screen.getByLabelText('Description'), 'Description');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.click(screen.getByText('Next'));

    // Complete step 2
    await user.selectOptions(screen.getByLabelText('Hazard Type'), 'chemical');
    await user.type(screen.getByLabelText('Hazard Source'), 'Source');
    await user.click(screen.getByText('Next'));

    expect(screen.getByText('Step 3: Risk Scoring')).toBeInTheDocument();
  });

  it('TC-P9-87: renders step 3 - Risk Scoring', async () => {
    const user = userEvent.setup();
    renderNewPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
    });

    // Navigate through steps
    await user.type(screen.getByLabelText('Title'), 'New Risk');
    await user.type(screen.getByLabelText('Description'), 'Description');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.click(screen.getByText('Next'));
    await user.selectOptions(screen.getByLabelText('Hazard Type'), 'chemical');
    await user.type(screen.getByLabelText('Hazard Source'), 'Source');
    await user.click(screen.getByText('Next'));

    expect(screen.getByText('Inherent Risk')).toBeInTheDocument();
    expect(screen.getByText('Residual Risk')).toBeInTheDocument();
  });

  it('TC-P9-88: allows going back to previous steps', async () => {
    const user = userEvent.setup();
    renderNewPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Title'), 'New Risk');
    await user.type(screen.getByLabelText('Description'), 'Description');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.click(screen.getByText('Next'));

    expect(screen.getByText('Step 2: Hazard Details')).toBeInTheDocument();

    await user.click(screen.getByText('Back'));

    expect(screen.getByText('Step 1: Basic Information')).toBeInTheDocument();
  });

  it('TC-P9-89: submits the form and redirects', async () => {
    const user = userEvent.setup();
    renderNewPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
    });

    // Complete all steps
    await user.type(screen.getByLabelText('Title'), 'New Risk');
    await user.type(screen.getByLabelText('Description'), 'Description');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.click(screen.getByText('Next'));

    await user.selectOptions(screen.getByLabelText('Hazard Type'), 'chemical');
    await user.type(screen.getByLabelText('Hazard Source'), 'Source');
    await user.click(screen.getByText('Next'));

    // Select scoring
    await user.click(screen.getAllByLabelText('3')[0]); // Likelihood
    await user.click(screen.getAllByLabelText('4')[1]); // Impact
    await user.click(screen.getByText('Create Risk'));

    await waitFor(() => {
      expect(risksApi.createRisk).toHaveBeenCalled();
    });
  });
});

describe('RiskHeatmapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    risksApi.getHeatmap.mockResolvedValue({ data: mockHeatmapData });
    risksApi.listCategories.mockResolvedValue({ data: mockCategories });
    risksApi.listRisks.mockResolvedValue({
      data: mockRisks,
      meta: { total: 2, page: 1, per_page: 20, total_pages: 1 }
    });
  });

  const renderHeatmapPage = () => {
    return render(
      <TestWrapper>
        <RiskHeatmapPage />
      </TestWrapper>
    );
  };

  it('TC-P9-90: renders 5x5 heatmap', async () => {
    renderHeatmapPage();

    await waitFor(() => {
      expect(screen.getByText('Risk Heatmap')).toBeInTheDocument();
      const cells = screen.getAllByRole('button');
      expect(cells.length).toBeGreaterThanOrEqual(25);
    });
  });

  it('TC-P9-91: displays risk counts in cells', async () => {
    renderHeatmapPage();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('TC-P9-92: shows legend', async () => {
    renderHeatmapPage();

    await waitFor(() => {
      expect(screen.getByText('LOW (1-4)')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM (5-9)')).toBeInTheDocument();
      expect(screen.getByText('HIGH (10-16)')).toBeInTheDocument();
      expect(screen.getByText('EXTREME (17-25)')).toBeInTheDocument();
    });
  });

  it('TC-P9-93: drills down when cell clicked', async () => {
    const user = userEvent.setup();
    renderHeatmapPage();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Click a cell with count
    await user.click(screen.getByText('2'));

    await waitFor(() => {
      expect(screen.getByText(/Risks at/)).toBeInTheDocument();
    });
  });

  it('TC-P9-94: displays total risk count', async () => {
    renderHeatmapPage();

    await waitFor(() => {
      expect(screen.getByText('17')).toBeInTheDocument();
      expect(screen.getByText('Total Risks')).toBeInTheDocument();
    });
  });

  it('TC-P9-95: filters heatmap by category', async () => {
    const user = userEvent.setup();
    renderHeatmapPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/category/i), '1');

    expect(risksApi.getHeatmap).toHaveBeenCalledWith(expect.objectContaining({
      category_id: '1'
    }));
  });

  it('TC-P9-96: handles loading state', () => {
    renderHeatmapPage();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('TC-P9-97: handles error state', async () => {
    risksApi.getHeatmap.mockRejectedValue(new Error('Failed to load'));

    renderHeatmapPage();

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
