import { useTheme } from '../../context/ThemeContext';
import PropTypes from 'prop-types';
import { Sun, Moon, Laptop, Palette, Check } from 'lucide-react';

const icons = {
  light: Sun,
  dark: Moon,
  system: Laptop
};

const labels = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System preference'
};

const ThemeToggle = ({ variant = 'icon' }) => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system'];
    const currentIndex = order.indexOf(theme);
    const nextIndex = (currentIndex + 1) % order.length;
    setTheme(order[nextIndex]);
  };

  if (variant === 'dropdown') {
    return (
      <div className="theme-toggle-dropdown" data-testid="theme-toggle-dropdown">
        <div className="dropdown-label">
          <Palette size={16} />
          Theme
        </div>
        {Object.keys(icons).map((themeOption) => (
          <button
            key={themeOption}
            type="button"
            className={`dropdown-option ${theme === themeOption ? 'active' : ''}`}
            onClick={() => setTheme(themeOption)}
            aria-pressed={theme === themeOption}
          >
            <span className="radio-indicator" aria-hidden="true">
              {theme === themeOption ? <Check size={14} /> : null}
            </span>
            <span>{themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}</span>
          </button>
        ))}
      </div>
    );
  }

  const Icon = icons[theme] || Sun;

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={cycleTheme}
      title={`Current: ${labels[theme]}. Click to change.`}
      aria-label={`Theme: ${labels[theme]}. Currently displaying ${resolvedTheme} mode.`}
      data-testid="theme-toggle"
    >
      <span className="theme-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
    </button>
  );
};

ThemeToggle.propTypes = {
  variant: PropTypes.oneOf(['icon', 'dropdown'])
};

export default ThemeToggle;
