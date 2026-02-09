import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { OrgProvider, useOrg } from '../context/OrgContext';

// TC-CTX-01: OrgContext provides organisation data
// TC-CTX-02: Threshold defaults when no settings

const mockOrganisation = {
  id: 'org-1',
  name: 'Test Org',
  slug: 'test-org',
  logoUrl: '/logo.png',
  timezone: 'UTC',
  settings: {
    dashboard: {
      openIncidentsWarning: 10,
      openIncidentsCritical: 20,
      overdueActionsWarning: 5,
      overdueActionsCritical: 10,
      failedInspectionsWarning: 3,
      failedInspectionsCritical: 8
    }
  }
};

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: mockOrganisation } }))
  }
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    token: 'test-token'
  })
}));

// Test component to display org context values
const TestConsumer = () => {
  const { organisation, thresholds, loading } = useOrg();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="org-name">{organisation?.name || 'No org'}</div>
      <div data-testid="threshold-warning">{thresholds.openIncidentsWarning}</div>
      <div data-testid="threshold-critical">{thresholds.openIncidentsCritical}</div>
    </div>
  );
};

describe('OrgContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides organisation data to consumers (TC-CTX-01)', async () => {
    render(
      <OrgProvider>
        <TestConsumer />
      </OrgProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('org-name')).toHaveTextContent('Test Org');
    });
  });

  it('provides threshold values from organisation settings (TC-CTX-02)', async () => {
    render(
      <OrgProvider>
        <TestConsumer />
      </OrgProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('threshold-warning')).toHaveTextContent('10');
    });

    expect(screen.getByTestId('threshold-critical')).toHaveTextContent('20');
  });
});

describe('OrgContext - Default Thresholds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('uses default thresholds when no settings exist', async () => {
    // Re-mock with empty settings for this test
    vi.doMock('../api/client', () => ({
      default: {
        get: vi.fn(() => Promise.resolve({
          data: {
            data: {
              id: 'org-1',
              name: 'Test Org',
              slug: 'test-org',
              settings: {} // No dashboard settings
            }
          }
        }))
      }
    }));

    // Re-import components after mock update
    const { OrgProvider: MockedOrgProvider, useOrg: MockedUseOrg } = await import('../context/OrgContext');

    const MockedTestConsumer = () => {
      const { organisation, thresholds, loading } = MockedUseOrg();
      if (loading) return <div>Loading...</div>;
      return (
        <div>
          <div data-testid="org-name">{organisation?.name || 'No org'}</div>
          <div data-testid="threshold-warning">{thresholds.openIncidentsWarning}</div>
          <div data-testid="threshold-critical">{thresholds.openIncidentsCritical}</div>
        </div>
      );
    };

    render(
      <MockedOrgProvider>
        <MockedTestConsumer />
      </MockedOrgProvider>
    );

    await waitFor(() => {
      // Default values should be used when no settings.dashboard exists
      expect(screen.getByTestId('threshold-warning')).toHaveTextContent('5');
    });
  });
});
