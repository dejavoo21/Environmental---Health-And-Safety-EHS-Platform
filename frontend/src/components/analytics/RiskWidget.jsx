const CATEGORY_STYLES = {
  critical: { bg: 'risk-badge-critical', icon: '\u25CF' },
  high: { bg: 'risk-badge-high', icon: '\u25CF' },
  medium: { bg: 'risk-badge-medium', icon: '\u25CF' },
  low: { bg: 'risk-badge-low', icon: '\u25CF' }
};

const RiskSiteRow = ({ site, onClick }) => {
  const category = site.risk_category || 'low';
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.low;

  const trend = site.trend;
  const trendArrow = trend === 'up' ? '\u25B2' : trend === 'down' ? '\u25BC' : '';
  const trendClass = trend === 'up' ? 'trend-up-bad' : trend === 'down' ? 'trend-down-good' : '';

  const handleClick = () => {
    if (onClick) {
      onClick(site.site_id || site.siteId, site);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`risk-site-row ${onClick ? 'clickable' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : 'listitem'}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className={`risk-indicator ${style.bg}`}>{style.icon}</span>
      <span className="risk-site-name">{site.site_name || site.siteName}</span>
      <span className="risk-score">{site.risk_score}</span>
      <span className={`risk-category-badge ${style.bg}`}>
        {category.toUpperCase()}
      </span>
      {trendArrow && (
        <span className={`risk-trend ${trendClass}`}>
          {trendArrow} {site.trend_change !== null && site.trend_change !== undefined ? Math.abs(site.trend_change) : ''}
        </span>
      )}
    </div>
  );
};

const RiskWidget = ({
  title = 'Top 5 High-Risk Sites',
  sites = [],
  onSiteClick,
  onViewAll,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="risk-widget">
        <div className="risk-widget-header">
          <h3 className="risk-widget-title">{title}</h3>
        </div>
        <div className="risk-widget-body">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="risk-site-row skeleton">
              <span className="skeleton-text">&nbsp;</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="risk-widget">
      <div className="risk-widget-header">
        <h3 className="risk-widget-title">{title}</h3>
      </div>

      <div className="risk-widget-body" role="list">
        {sites.length === 0 ? (
          <div className="risk-empty">
            No risk data available
          </div>
        ) : (
          sites.map((site, index) => (
            <RiskSiteRow
              key={site.site_id || site.siteId || index}
              site={site}
              onClick={onSiteClick}
            />
          ))
        )}
      </div>

      {onViewAll && sites.length > 0 && (
        <div className="risk-widget-footer">
          <button className="btn btn-link" onClick={onViewAll}>
            View All Sites &rarr;
          </button>
        </div>
      )}
    </div>
  );
};

// Incident Types Widget
export const IncidentTypesWidget = ({
  title = 'Top Incident Types',
  data = [],
  onTypeClick,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="risk-widget">
        <div className="risk-widget-header">
          <h3 className="risk-widget-title">{title}</h3>
        </div>
        <div className="risk-widget-body">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="type-row skeleton">
              <span className="skeleton-text">&nbsp;</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="risk-widget">
      <div className="risk-widget-header">
        <h3 className="risk-widget-title">{title}</h3>
      </div>

      <div className="risk-widget-body" role="list">
        {data.length === 0 ? (
          <div className="risk-empty">
            No incident type data available
          </div>
        ) : (
          data.slice(0, 5).map((item, index) => (
            <div
              key={item.typeId || index}
              className={`type-row ${onTypeClick ? 'clickable' : ''}`}
              onClick={() => onTypeClick?.(item.typeId, item)}
              role={onTypeClick ? 'button' : 'listitem'}
              tabIndex={onTypeClick ? 0 : undefined}
            >
              <span className="type-name">{item.typeName}</span>
              <span className="type-count">{item.incidentCount}</span>
              <span className="type-percent">{item.percentage}%</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RiskWidget;
