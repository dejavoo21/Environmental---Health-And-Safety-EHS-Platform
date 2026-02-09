import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AttachmentsPanel from '../components/AttachmentsPanel';

// TC-ATT-01, TC-ATT-02, TC-ATT-03: Attachments panel tests

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

import api from '../api/client';

describe('AttachmentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays attachments list when loaded (TC-ATT-01)', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        attachments: [
          {
            id: '1',
            filename: 'photo.jpg',
            fileSize: 1024,
            uploadedAt: '2025-01-01',
            uploadedBy: { firstName: 'John', lastName: 'Doe' }
          }
        ]
      }
    });

    render(<AttachmentsPanel entityType="incident" entityId="1" />);

    await waitFor(() => {
      expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    });
  });

  it('shows empty state when no attachments (TC-ATT-02)', async () => {
    api.get.mockResolvedValueOnce({ data: { attachments: [] } });

    render(<AttachmentsPanel entityType="incident" entityId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/no attachments/i)).toBeInTheDocument();
    });
  });

  it('shows upload button (TC-ATT-03)', async () => {
    api.get.mockResolvedValueOnce({ data: { attachments: [] } });

    render(<AttachmentsPanel entityType="incident" entityId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/upload file/i)).toBeInTheDocument();
    });
  });

  it('formats file size correctly (TC-ATT-04)', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        attachments: [
          {
            id: '1',
            filename: 'large-doc.pdf',
            fileSize: 2097152, // 2 MB
            uploadedAt: '2025-01-01',
            uploadedBy: { firstName: 'Jane', lastName: 'Smith' }
          }
        ]
      }
    });

    render(<AttachmentsPanel entityType="incident" entityId="1" />);

    await waitFor(() => {
      expect(screen.getByText('large-doc.pdf')).toBeInTheDocument();
    });

    expect(screen.getByText(/2\.0 MB/i)).toBeInTheDocument();
  });
});
