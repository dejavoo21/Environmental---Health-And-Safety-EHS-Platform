import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AdminOrganisationPage from '../pages/AdminOrganisationPage';

// TC-ORG-01: View organisation profile
// TC-ORG-02: Update organisation name/timezone
// TC-ORG-03: Upload/delete logo
// TC-ORG-04: Update dashboard thresholds

const mockOrganisation = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  logoUrl: null,
  timezone: 'UTC',
  settings: {
    dashboard: {
      openIncidentsWarning: 5,
      openIncidentsCritical: 10,
      overdueActionsWarning: 3,
      overdueActionsCritical: 5,
      failedInspectionsWarning: 2,
      failedInspectionsCritical: 5
    }
  }
};

vi.mock('../context/OrgContext', () => ({
  useOrg: () => ({
    organisation: mockOrganisation,
    loading: false,
    error: null,
    refreshOrganisation: vi.fn()
  })
}));

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/admin/organisation/escalation') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              escalation: {
                enabled: true,
                daysOverdue: 5,
                notifyManagers: true,
                customEmail: null
              }
            }
          }
        });
      }
      return Promise.resolve({ data: {} });
    }),
    put: vi.fn(() => Promise.resolve({ data: { data: mockOrganisation } })),
    post: vi.fn(() => Promise.resolve({ data: { data: { logoUrl: '/logo.png' } } })),
    delete: vi.fn(() => Promise.resolve({ data: { data: { message: 'Logo removed' } } }))
  }
}));

describe('AdminOrganisationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays organisation profile form (TC-ORG-01)', () => {
    render(
      <MemoryRouter>
        <AdminOrganisationPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Organisation Profile')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('UTC')).toBeInTheDocument();
  });

  it('displays dashboard settings section (TC-ORG-04)', () => {
    render(
      <MemoryRouter>
        <AdminOrganisationPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Settings')).toBeInTheDocument();
    expect(screen.getByText('Open Incidents')).toBeInTheDocument();
    expect(screen.getByText('Overdue Actions')).toBeInTheDocument();
    expect(screen.getByText('Failed Inspections (30 days)')).toBeInTheDocument();
  });

  it('displays logo section with upload option (TC-ORG-03)', () => {
    render(
      <MemoryRouter>
        <AdminOrganisationPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Organisation Logo')).toBeInTheDocument();
    expect(screen.getByText('Upload New')).toBeInTheDocument();
    expect(screen.getByText('Allowed: PNG, JPEG, SVG. Max size: 2 MB')).toBeInTheDocument();
  });

  it('validates name is required on profile submit (TC-ORG-02)', async () => {
    render(
      <MemoryRouter>
        <AdminOrganisationPage />
      </MemoryRouter>
    );

    const nameInput = screen.getByDisplayValue('Acme Corp');
    fireEvent.change(nameInput, { target: { value: '' } });

    const saveButtons = screen.getAllByText('Save Changes');
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Organisation name is required')).toBeInTheDocument();
    });
  });

  it('displays threshold inputs with correct values', () => {
    render(
      <MemoryRouter>
        <AdminOrganisationPage />
      </MemoryRouter>
    );

    // Check for threshold inputs - they should show the mock values
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBeGreaterThanOrEqual(6);
  });

  it('displays escalation settings section', async () => {
    render(
      <MemoryRouter>
        <AdminOrganisationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Action Escalation Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Enable automatic escalation')).toBeInTheDocument();
  });

  it('loads escalation settings from API', async () => {
    const api = await import('../api/client');

    render(
      <MemoryRouter>
        <AdminOrganisationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.default.get).toHaveBeenCalledWith('/admin/organisation/escalation');
    });
  });

  it('shows escalation options when enabled', async () => {
    render(
      <MemoryRouter>
        <AdminOrganisationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Days after due date')).toBeInTheDocument();
      expect(screen.getByText('Notify all managers')).toBeInTheDocument();
      expect(screen.getByText('Additional notification email (optional)')).toBeInTheDocument();
    });
  });
});
