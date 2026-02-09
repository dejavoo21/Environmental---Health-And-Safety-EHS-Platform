import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import LoginPage from '../pages/LoginPage';

// TC-AUTH-01, TC-AUTH-02 (frontend validation + login call)

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(() => Promise.resolve())
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

describe('LoginPage', () => {
  it('shows validation error when fields are missing (TC-AUTH-02)', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(await screen.findByText(/required/i)).toBeInTheDocument();
  });
});
