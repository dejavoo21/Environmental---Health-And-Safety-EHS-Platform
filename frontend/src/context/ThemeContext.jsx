import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'ehs_theme';

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    // Initialize from localStorage or default to 'system'
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || 'system';
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState('light');

  // Resolve the actual theme based on preference
  const resolveTheme = useCallback(() => {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  // Update resolved theme and apply to document
  useEffect(() => {
    const resolved = resolveTheme();
    setResolvedTheme(resolved);

    // Apply theme class to document root
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    document.documentElement.classList.add(`${resolved}-theme`);
  }, [resolveTheme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        const resolved = resolveTheme();
        setResolvedTheme(resolved);
        document.documentElement.setAttribute('data-theme', resolved);
        document.documentElement.classList.remove('light-theme', 'dark-theme');
        document.documentElement.classList.add(`${resolved}-theme`);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, resolveTheme]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
    isDark: resolvedTheme === 'dark'
  }), [theme, resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
};

export default ThemeContext;
