import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import Layout from '../components/Layout';

const mockUseAuth = vi.fn();

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('../context/OrgContext', () => ({
  useOrg: () => ({ organisation: { name: 'Default Organisation' } })
}));

vi.mock('../components/notifications', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />
}));

vi.mock('../components/security', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />
}));

const renderLayout = (role) => {
  mockUseAuth.mockReturnValue({
    user: { role, name: 'Test User' },
    logout: vi.fn()
  });

  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>Dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('Layout navigation groups', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hides the Admin group for worker role', () => {
    renderLayout('worker');
    expect(screen.queryByText(/Admin/i)).not.toBeInTheDocument();
  });

  it('shows the Admin group for admin role', () => {
    renderLayout('admin');
    expect(screen.getByRole('button', { name: /Admin/i })).toBeInTheDocument();
  });
});
