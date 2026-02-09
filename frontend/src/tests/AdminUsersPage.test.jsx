import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AdminUsersPage from '../pages/AdminUsersPage';

// TC-USR-01: List users with role/status badges
// TC-USR-02: Create new user
// TC-USR-03: Update user role
// TC-USR-04: Disable/enable users
// TC-USR-05: Reset password
// TC-USR-06: Last admin protection

const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'admin',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'user-2',
    email: 'manager@test.com',
    name: 'Manager User',
    role: 'manager',
    isActive: true,
    createdAt: '2025-01-02T00:00:00Z'
  },
  {
    id: 'user-3',
    email: 'worker@test.com',
    name: 'Worker User',
    role: 'worker',
    isActive: false,
    createdAt: '2025-01-03T00:00:00Z'
  }
];

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', role: 'admin' }
  })
}));

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: { users: mockUsers } } })),
    post: vi.fn(() => Promise.resolve({ data: { data: mockUsers[0] } })),
    put: vi.fn(() => Promise.resolve({ data: { data: mockUsers[0] } }))
  }
}));

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays users list with role badges (TC-USR-01)', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    expect(screen.getByText('Manager User')).toBeInTheDocument();
    expect(screen.getByText('Worker User')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('manager')).toBeInTheDocument();
    expect(screen.getByText('worker')).toBeInTheDocument();
  });

  it('displays status badges for active/disabled users (TC-USR-01)', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Check for status badges (not filter options)
    const activeBadges = document.querySelectorAll('.badge.status-active-user');
    const disabledBadges = document.querySelectorAll('.badge.status-disabled');
    expect(activeBadges.length).toBe(2);
    expect(disabledBadges.length).toBe(1);
  });

  it('shows Add User button', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('+ Add User')).toBeInTheDocument();
    });
  });

  it('opens user form modal when Add User clicked (TC-USR-02)', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('+ Add User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Add User'));

    await waitFor(() => {
      expect(screen.getByText('Add New User')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeInTheDocument();
  });

  it('validates required fields in user form (TC-USR-02)', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('+ Add User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Add User'));

    await waitFor(() => {
      expect(screen.getByText('Add New User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(screen.getByText('Email, name, and role are required.')).toBeInTheDocument();
    });
  });

  it('shows filter options for role and status', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Use getAllByText since "Role" and "Status" appear in both filters and table headers
      expect(screen.getAllByText('Role').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('Status').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Search')).toBeInTheDocument();
    // Check filter dropdown options exist
    expect(screen.getByText('All Roles')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('shows actions menu for each user', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // There should be action menu triggers for each user
    const actionButtons = screen.getAllByLabelText('Actions menu');
    expect(actionButtons.length).toBe(3);
  });

  it('indicates current user with "(you)" label', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('(you)')).toBeInTheDocument();
    });
  });
});
