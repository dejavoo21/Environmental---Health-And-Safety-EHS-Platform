import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import KPICard from '../components/analytics/KPICard';

describe('KPICard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders title and value', () => {
      render(<KPICard title="Total Incidents" value={42} />);

      expect(screen.getByText('Total Incidents')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('formats large numbers with commas', () => {
      render(<KPICard title="Count" value={1234567} />);

      expect(screen.getByText('1,234,567')).toBeInTheDocument();
    });

    it('displays percentage values correctly', () => {
      render(<KPICard title="Rate" value={87} format="percent" />);

      expect(screen.getByText('87%')).toBeInTheDocument();
    });

    it('displays days format correctly', () => {
      render(<KPICard title="Avg Time" value={4.5} format="days" />);

      expect(screen.getByText('4.5 days')).toBeInTheDocument();
    });
  });

  describe('Trend Indicators', () => {
    it('shows up arrow for up trend', () => {
      render(<KPICard title="Test" value={10} trend="up" percentChange={5} />);

      expect(screen.getByText('▲')).toBeInTheDocument();
    });

    it('shows down arrow for down trend', () => {
      render(<KPICard title="Test" value={10} trend="down" percentChange={-5} />);

      expect(screen.getByText('▼')).toBeInTheDocument();
    });

    it('shows percent change value with plus sign for positive', () => {
      render(<KPICard title="Test" value={10} trend="up" percentChange={12.5} />);

      expect(screen.getByText('+12.5%')).toBeInTheDocument();
    });

    it('shows negative percent change', () => {
      render(<KPICard title="Test" value={10} trend="down" percentChange={-8.3} />);

      expect(screen.getByText('-8.3%')).toBeInTheDocument();
    });

    it('shows vs previous period label', () => {
      render(<KPICard title="Test" value={10} trend="up" percentChange={5} />);

      expect(screen.getByText('vs previous period')).toBeInTheDocument();
    });

    it('applies good trend class for up trend by default', () => {
      render(<KPICard title="Test" value={10} trend="up" percentChange={10} />);

      const trendEl = document.querySelector('.kpi-trend');
      expect(trendEl).toHaveClass('kpi-trend-good');
    });

    it('applies bad trend class for down trend by default', () => {
      render(<KPICard title="Test" value={10} trend="down" percentChange={-10} />);

      const trendEl = document.querySelector('.kpi-trend');
      expect(trendEl).toHaveClass('kpi-trend-bad');
    });

    it('inverts colors when invertTrend is true', () => {
      // For metrics where "up" is bad (like incidents)
      render(<KPICard title="Test" value={10} trend="up" percentChange={10} invertTrend />);

      const trendEl = document.querySelector('.kpi-trend');
      expect(trendEl).toHaveClass('kpi-trend-bad');
    });

    it('does not show trend when no trend prop', () => {
      render(<KPICard title="Test" value={10} />);

      expect(screen.queryByText('▲')).not.toBeInTheDocument();
      expect(screen.queryByText('▼')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows skeleton when loading', () => {
      render(<KPICard title="Test" value={10} loading />);

      expect(screen.queryByText('10')).not.toBeInTheDocument();
      expect(document.querySelector('.kpi-card-loading')).toBeInTheDocument();
      expect(document.querySelectorAll('.skeleton-text').length).toBeGreaterThan(0);
    });

    it('does not respond to clicks when loading', () => {
      const onClick = vi.fn();
      render(<KPICard title="Test" value={10} loading onClick={onClick} />);

      const card = document.querySelector('.kpi-card');
      fireEvent.click(card);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(<KPICard title="Test" value={10} onClick={onClick} />);

      const card = document.querySelector('.kpi-card');
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick on Enter key press', () => {
      const onClick = vi.fn();
      render(<KPICard title="Test" value={10} onClick={onClick} />);

      const card = document.querySelector('.kpi-card');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick on Space key press', () => {
      const onClick = vi.fn();
      render(<KPICard title="Test" value={10} onClick={onClick} />);

      const card = document.querySelector('.kpi-card');
      fireEvent.keyDown(card, { key: ' ' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('has clickable class when onClick provided', () => {
      render(<KPICard title="Test" value={10} onClick={() => {}} />);

      expect(document.querySelector('.kpi-card-clickable')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct tabIndex when clickable', () => {
      render(<KPICard title="Test" value={10} onClick={() => {}} />);

      const card = document.querySelector('.kpi-card');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('has button role when clickable', () => {
      render(<KPICard title="Test" value={10} onClick={() => {}} />);

      const card = document.querySelector('.kpi-card');
      expect(card).toHaveAttribute('role', 'button');
    });

    it('has article role when not clickable', () => {
      render(<KPICard title="Test" value={10} />);

      const card = document.querySelector('.kpi-card');
      expect(card).toHaveAttribute('role', 'article');
    });

    it('has aria-label describing the card content', () => {
      render(<KPICard title="Total" value={42} />);

      const card = document.querySelector('.kpi-card');
      expect(card).toHaveAttribute('aria-label', 'Total: 42');
    });

    it('includes trend in aria-label', () => {
      render(<KPICard title="Total" value={42} trend="up" percentChange={10} />);

      const card = document.querySelector('.kpi-card');
      expect(card.getAttribute('aria-label')).toContain('+10%');
    });
  });

  describe('Edge Cases', () => {
    it('handles null value gracefully', () => {
      render(<KPICard title="Test" value={null} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('handles undefined trend gracefully', () => {
      render(<KPICard title="Test" value={10} trend={undefined} />);

      expect(screen.queryByText('▲')).not.toBeInTheDocument();
      expect(screen.queryByText('▼')).not.toBeInTheDocument();
    });

    it('handles very large numbers', () => {
      render(<KPICard title="Test" value={9999999} />);

      expect(screen.getByText('9,999,999')).toBeInTheDocument();
    });

    it('handles decimal values', () => {
      render(<KPICard title="Test" value={4.5} />);

      expect(screen.getByText('4.5')).toBeInTheDocument();
    });
  });

  describe('Help Text', () => {
    it('shows help icon when helpText provided', () => {
      render(<KPICard title="Test" value={10} helpText="This is help" />);

      expect(screen.getByText('?')).toBeInTheDocument();
    });
  });
});
