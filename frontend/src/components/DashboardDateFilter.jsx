import { useState } from 'react';
import { Calendar } from 'lucide-react';
import './DashboardDateFilter.css';

/**
 * Reusable date filter component for dashboard cards
 *
 * @param {Object} props
 * @param {string} props.period - Current selected period
 * @param {function} props.onPeriodChange - Callback when period changes
 * @param {string} [props.fromDate] - Custom from date (for custom period)
 * @param {string} [props.toDate] - Custom to date (for custom period)
 * @param {function} [props.onFromDateChange] - Callback when from date changes
 * @param {function} [props.onToDateChange] - Callback when to date changes
 * @param {boolean} [props.showCustomDates=true] - Whether to show custom date inputs
 * @param {Array} [props.periodOptions] - Custom period options array
 */
const DashboardDateFilter = ({
  period,
  onPeriodChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  showCustomDates = true,
  periodOptions
}) => {
  const defaultOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '12m', label: 'Last 12 months' },
    { value: 'custom', label: 'Custom' }
  ];

  const options = periodOptions || defaultOptions;
  const showDateInputs = showCustomDates && period === 'custom';

  return (
    <div className="dashboard-date-filter">
      <select
        className="dashboard-filter-select"
        value={period}
        onChange={(e) => onPeriodChange(e.target.value)}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {showDateInputs && (
        <div className="dashboard-filter-dates">
          <input
            type="date"
            className="dashboard-filter-date"
            value={fromDate || ''}
            onChange={(e) => onFromDateChange?.(e.target.value)}
            placeholder="From"
          />
          <span className="dashboard-filter-separator">to</span>
          <input
            type="date"
            className="dashboard-filter-date"
            value={toDate || ''}
            onChange={(e) => onToDateChange?.(e.target.value)}
            placeholder="To"
          />
        </div>
      )}
    </div>
  );
};

/**
 * Simple period-only filter (no custom dates)
 */
export const SimplePeriodFilter = ({ period, onPeriodChange, periodOptions }) => {
  const defaultOptions = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' }
  ];

  const options = periodOptions || defaultOptions;

  return (
    <div className="dashboard-date-filter">
      <select
        className="dashboard-filter-select"
        value={period}
        onChange={(e) => onPeriodChange(e.target.value)}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

/**
 * Helper function to calculate date range from period
 */
export const getDateRangeFromPeriod = (period, customFrom, customTo) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return { from: today, to: now };
    case '7d':
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return { from: sevenDaysAgo, to: now };
    case '30d':
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return { from: thirtyDaysAgo, to: now };
    case '12m':
      const twelveMonthsAgo = new Date(today);
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      return { from: twelveMonthsAgo, to: now };
    case 'custom':
      return {
        from: customFrom ? new Date(customFrom) : null,
        to: customTo ? new Date(customTo) : now
      };
    default:
      return { from: null, to: now };
  }
};

/**
 * Filter data by date range
 */
export const filterByDateRange = (data, dateField, from, to) => {
  if (!data || !Array.isArray(data)) return [];

  return data.filter(item => {
    const itemDate = new Date(item[dateField]);
    if (from && itemDate < from) return false;
    if (to && itemDate > to) return false;
    return true;
  });
};

export default DashboardDateFilter;
