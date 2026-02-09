import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ActivityLogPanel from '../components/ActivityLogPanel';

// TC-AUD-01, TC-AUD-02, TC-AUD-03: Activity log panel tests

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn()
  }
}));

import api from '../api/client';

describe('ActivityLogPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays activity events when loaded (TC-AUD-01)', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        events: [
          {
            id: '1',
            eventType: 'created',
            occurredAt: '2025-01-01T10:00:00Z',
            newValue: { status: 'open' }
          },
          {
            id: '2',
            eventType: 'status_changed',
            occurredAt: '2025-01-02T10:00:00Z',
            oldValue: { status: 'open' },
            newValue: { status: 'closed' }
          }
        ]
      }
    });

    render(<ActivityLogPanel entityType="incident" entityId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Created')).toBeInTheDocument();
    });

    expect(screen.getByText('Status Changed')).toBeInTheDocument();
  });

  it('shows empty state when no events (TC-AUD-02)', async () => {
    api.get.mockResolvedValueOnce({ data: { events: [] } });

    render(<ActivityLogPanel entityType="incident" entityId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/no activity/i)).toBeInTheDocument();
    });
  });

  it('formats status change details correctly (TC-AUD-03)', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        events: [
          {
            id: '1',
            eventType: 'status_changed',
            occurredAt: '2025-01-02T10:00:00Z',
            oldValue: { status: 'open' },
            newValue: { status: 'under_investigation' }
          }
        ]
      }
    });

    render(<ActivityLogPanel entityType="incident" entityId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/open -> under_investigation/i)).toBeInTheDocument();
    });
  });

  it('calls correct endpoint for different entity types (TC-AUD-04)', async () => {
    api.get.mockResolvedValue({ data: { events: [] } });

    const { rerender } = render(<ActivityLogPanel entityType="incident" entityId="1" />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/incidents/1/audit-log');
    });

    api.get.mockClear();

    rerender(<ActivityLogPanel entityType="action" entityId="2" />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/actions/2/audit-log');
    });
  });
});
