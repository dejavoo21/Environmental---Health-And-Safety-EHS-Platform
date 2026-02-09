import { useState } from 'react';

/**
 * Trend interpretation: for some metrics, "up" is bad (incidents), for others "up" is good (pass rate)
 */
const getTrendColor = (trend, invertTrend = false) => {
  if (!trend || trend === 'neutral') return 'kpi-trend-neutral';

  const isPositive = trend === 'up';
  const isGoodTrend = invertTrend ? !isPositive : isPositive;

  return isGoodTrend ? 'kpi-trend-good' : 'kpi-trend-bad';
};

const formatValue = (value, format) => {
  if (value === null || value === undefined) return '-';

  switch (format) {
    case 'percent':
      return `${value}%`;
    case 'days':
      return `${value} days`;
    case 'number':
    default:
      return typeof value === 'number' ? value.toLocaleString() : value;
  }
};

const KPICard = ({
  title,
  value,
  trend,
  percentChange,
  format = 'number',
  onClick,
  helpText,
  invertTrend = false, // Set to true when "down" is good (e.g., incidents, overdue)
  loading = false
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const trendArrow = trend === 'up' ? '\u25B2' : trend === 'down' ? '\u25BC' : '';
  const trendClass = getTrendColor(trend, invertTrend);
  const changeText = percentChange !== null && percentChange !== undefined
    ? `${percentChange > 0 ? '+' : ''}${percentChange}%`
    : '';

  const handleClick = () => {
    if (onClick && !loading) {
      onClick();
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      handleClick();
    }
  };

  if (loading) {
    return (
      <div className="kpi-card kpi-card-loading">
        <div className="kpi-header">
          <span className="kpi-title skeleton-text">&nbsp;</span>
        </div>
        <div className="kpi-value skeleton-text">&nbsp;</div>
        <div className="kpi-trend skeleton-text">&nbsp;</div>
      </div>
    );
  }

  return (
    <div
      className={`kpi-card ${onClick ? 'kpi-card-clickable' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${title}: ${formatValue(value, format)}${changeText ? `, ${changeText} from previous period` : ''}`}
    >
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        {helpText && (
          <span
            className="kpi-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label={helpText}
          >
            ?
            {showTooltip && (
              <span className="kpi-tooltip">{helpText}</span>
            )}
          </span>
        )}
      </div>

      <div className="kpi-value">
        {formatValue(value, format)}
      </div>

      {(trendArrow || changeText) && (
        <div className={`kpi-trend ${trendClass}`}>
          {trendArrow && <span className="kpi-trend-arrow">{trendArrow}</span>}
          {changeText && <span className="kpi-trend-change">{changeText}</span>}
          <span className="kpi-trend-label">vs previous period</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
