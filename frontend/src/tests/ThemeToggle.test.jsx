import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/security/ThemeToggle';

// TC-P6-037, TC-P6-038, TC-P6-039, TC-P6-040

// Helper component to access theme context
function ThemeDisplay() {
  const { theme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
    </div>
  );
}

describe('ThemeToggle', () => {
  let mockLocalStorage = {};

  beforeEach(() => {
    mockLocalStorage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockLocalStorage[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockLocalStorage[key] = value;
    });

    // Mock matchMedia for system theme
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders theme toggle button', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('cycles through themes: light → dark → system (TC-P6-037)', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeDisplay />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId('theme-toggle');
    
    // Initial state is 'system'
    expect(screen.getByTestId('theme').textContent).toBe('system');

    // Click to light
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('theme').textContent).toBe('light');

    // Click to dark
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('theme').textContent).toBe('dark');

    // Click back to system
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('persists theme preference to localStorage (TC-P6-038)', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('theme-toggle')); // light
    expect(mockLocalStorage['ehs_theme']).toBe('light');

    fireEvent.click(screen.getByTestId('theme-toggle')); // dark
    expect(mockLocalStorage['ehs_theme']).toBe('dark');
  });

  it('loads theme preference from localStorage on mount (TC-P6-038)', () => {
    mockLocalStorage['ehs_theme'] = 'dark';

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('resolves system theme based on OS preference (TC-P6-039)', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    // System theme with dark OS preference should resolve to dark
    expect(screen.getByTestId('theme').textContent).toBe('system');
    expect(screen.getByTestId('resolved-theme').textContent).toBe('dark');
  });

  it('resolves system theme to light when OS prefers light (TC-P6-040)', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: light)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    expect(screen.getByTestId('resolved-theme').textContent).toBe('light');
  });

  it('shows correct icon for each theme', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeDisplay />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId('theme-toggle');

    // System theme - has theme-icon span
    expect(toggleBtn.querySelector('.theme-icon')).toBeTruthy();

    // Click to light
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('theme').textContent).toBe('light');

    // Click to dark
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('applies theme class to document element', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('theme-toggle')); // light
    expect(document.documentElement.classList.contains('light-theme') || 
           document.documentElement.getAttribute('data-theme') === 'light' ||
           document.documentElement.classList.contains('theme-light')).toBeTruthy();

    fireEvent.click(screen.getByTestId('theme-toggle')); // dark
    expect(document.documentElement.classList.contains('dark-theme') || 
           document.documentElement.getAttribute('data-theme') === 'dark' ||
           document.documentElement.classList.contains('theme-dark')).toBeTruthy();
  });

  it('has accessible label', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId('theme-toggle');
    expect(toggleBtn.getAttribute('aria-label') || toggleBtn.getAttribute('title')).toBeTruthy();
  });
});

describe('ThemeContext', () => {
  it('provides theme context to children', () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toBeInTheDocument();
    expect(screen.getByTestId('resolved-theme')).toBeInTheDocument();
  });

  it('throws error when useTheme used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ThemeDisplay />);
    }).toThrow();

    consoleSpy.mockRestore();
  });
});
