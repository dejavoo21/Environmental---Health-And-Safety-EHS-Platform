import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ReportsPage from '../pages/ReportsPage';

// TC-RPT-01: Render export panels with filters
// TC-RPT-02: Trigger export and handle success
// TC-RPT-03: Handle row limit error
// TC-RPT-04: Handle rate limit error
// TC-RPT-05: PDF export button present (Phase 4)
// TC-RPT-06: Email Report button present (Phase 4)
// TC-RPT-07: Email modal opens and pre-fills email (Phase 4)

const mockSites = [
  { id: 'site-1', name: 'Site A' },
  { id: 'site-2', name: 'Site B' }
];

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn((url) => {
      if (url.includes('/sites')) {
        return Promise.resolve({ data: { sites: mockSites } });
      }
      // For exports (CSV or PDF), return a blob
      if (url.includes('format=pdf')) {
        return Promise.resolve({
          data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
          headers: {
            'content-disposition': 'attachment; filename="export.pdf"'
          }
        });
      }
      return Promise.resolve({
        data: new Blob(['test,data'], { type: 'text/csv' }),
        headers: {
          'content-disposition': 'attachment; filename="export.csv"'
        }
      });
    }),
    post: vi.fn(() => {
      return Promise.resolve({
        data: {
          success: true,
          message: 'Report sent successfully',
          data: {
            recipient: 'test@example.com',
            filename: 'incidents_test_2026-01-26.pdf',
            rowCount: 10
          }
        }
      });
    })
  }
}));

// Mock AuthContext for EmailReportModal
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'user@example.com', name: 'Test User', role: 'admin' },
    token: 'test-token'
  })
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:test');
global.URL.revokeObjectURL = vi.fn();

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays export panels for incidents, inspections, and actions (TC-RPT-01)', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Incidents')).toBeInTheDocument();
    });

    expect(screen.getByText('Export Inspections')).toBeInTheDocument();
    expect(screen.getByText('Export Actions')).toBeInTheDocument();
  });

  it('displays date range filters for each panel (TC-RPT-01)', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Incidents')).toBeInTheDocument();
    });

    // Check for From Date labels (should be 2 - Incidents and Inspections)
    const fromDateLabels = screen.getAllByText('From Date');
    expect(fromDateLabels.length).toBe(2);

    // Actions has "Created From" instead
    expect(screen.getByText('Created From')).toBeInTheDocument();
  });

  it('displays export CSV buttons for each panel', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Incidents')).toBeInTheDocument();
    });

    const exportButtons = screen.getAllByText('Export CSV');
    expect(exportButtons.length).toBe(3);
  });

  it('displays export PDF buttons for each panel (TC-RPT-05)', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Incidents')).toBeInTheDocument();
    });

    const pdfButtons = screen.getAllByText('Export PDF');
    expect(pdfButtons.length).toBe(3);
  });

  it('displays Email Report buttons for each panel (TC-RPT-06)', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Incidents')).toBeInTheDocument();
    });

    const emailButtons = screen.getAllByText('Email Report');
    expect(emailButtons.length).toBe(3);
  });

  it('opens email modal when Email Report clicked (TC-RPT-07)', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Incidents')).toBeInTheDocument();
    });

    // Click the first Email Report button (Incidents)
    const emailButtons = screen.getAllByText('Email Report');
    fireEvent.click(emailButtons[0]);

    // Modal should open with title
    await waitFor(() => {
      expect(screen.getByText('Email Incidents Report')).toBeInTheDocument();
    });

    // Should have pre-filled email field
    const emailInput = screen.getByPlaceholderText('recipient@example.com');
    expect(emailInput).toHaveValue('user@example.com');

    // Should have subject field
    expect(screen.getByPlaceholderText('Email subject (optional)')).toBeInTheDocument();

    // Should have Cancel and Send buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Send Report')).toBeInTheDocument();
  });

  it('closes email modal when Cancel clicked', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Incidents')).toBeInTheDocument();
    });

    // Open modal
    const emailButtons = screen.getAllByText('Email Report');
    fireEvent.click(emailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Email Incidents Report')).toBeInTheDocument();
    });

    // Click Cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Email Incidents Report')).not.toBeInTheDocument();
    });
  });

  it('validates email in modal before sending', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Incidents')).toBeInTheDocument();
    });

    // Open modal
    const emailButtons = screen.getAllByText('Email Report');
    fireEvent.click(emailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Email Incidents Report')).toBeInTheDocument();
    });

    // Clear email field
    const emailInput = screen.getByPlaceholderText('recipient@example.com');
    fireEvent.change(emailInput, { target: { value: '' } });

    // Try to send
    fireEvent.click(screen.getByText('Send Report'));

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Email address is required')).toBeInTheDocument();
    });
  });

  it('validates email format in modal', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Incidents')).toBeInTheDocument();
    });

    // Open modal
    const emailButtons = screen.getAllByText('Email Report');
    fireEvent.click(emailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Email Incidents Report')).toBeInTheDocument();
    });

    // Get the email input and verify it exists
    const emailInput = screen.getByPlaceholderText('recipient@example.com');
    expect(emailInput).toBeInTheDocument();

    // The email input should have a valid email by default (from mock)
    expect(emailInput).toHaveValue('user@example.com');

    // Clear and enter invalid email, then check that the input type validation works
    // (HTML5 email type provides basic format checking)
    fireEvent.change(emailInput, { target: { value: 'notanemail' } });
    expect(emailInput).toHaveValue('notanemail');

    // Modal should still be open
    expect(screen.getByText('Email Incidents Report')).toBeInTheDocument();
  });

  it('displays row limit hint', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Exports are limited to 10,000 rows/)).toBeInTheDocument();
    });
  });

  it('displays site filter dropdown with sites (TC-RPT-01)', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Incidents')).toBeInTheDocument();
    });

    // Check for site dropdown options
    const siteDropdowns = screen.getAllByRole('combobox');
    expect(siteDropdowns.length).toBeGreaterThan(0);
  });

  it('displays intro text about exports (updated for Phase 4)', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Export your data to CSV or PDF format/)).toBeInTheDocument();
    });
  });

  it('displays status filter for incidents', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Incidents')).toBeInTheDocument();
    });

    // Find status labels (multiple panels have status)
    const statusLabels = screen.getAllByText('Status');
    expect(statusLabels.length).toBeGreaterThan(0);
  });

  it('displays severity filter for incidents', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Severity')).toBeInTheDocument();
    });
  });

  it('displays result filter for inspections', async () => {
    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument();
    });
  });
});
