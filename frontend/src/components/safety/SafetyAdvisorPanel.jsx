import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getTaskSafetySummary, acknowledgeSafetyAdvisor, getAcknowledgementStatus } from '../../api/safetyAdvisor';
import './SafetyAdvisorPanel.css';

/**
 * SafetyAdvisorPanel - Phase 11
 *
 * Displays safety intelligence for a site or task including:
 * - Weather conditions
 * - PPE recommendations
 * - Today's Safety Moment
 * - Applicable legislation
 *
 * Supports high-risk workflow enforcement (BR-11-18a):
 * - For high-risk tasks, acknowledgement is REQUIRED before main action
 * - Main action button should be disabled until hasAcknowledged = true
 *
 * Test Cases: TC-271-1, TC-276-1, TC-276-2
 */
const SafetyAdvisorPanel = ({
  siteId,
  entityType,
  entityId,
  safetySummary: externalSummary,
  onAcknowledge,
  requiresAcknowledgement = false,
  hasAcknowledged: externalHasAcknowledged = false
}) => {
  const [safetySummary, setSafetySummary] = useState(externalSummary || null);
  const [loading, setLoading] = useState(!externalSummary);
  const [error, setError] = useState('');
  const [showMoment, setShowMoment] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(externalHasAcknowledged);
  const [acknowledgedAt, setAcknowledgedAt] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    weather: true,
    ppe: true,
    moment: true,
    legislation: false
  });

  // Fetch safety summary if not provided externally
  useEffect(() => {
    if (externalSummary) {
      setSafetySummary(externalSummary);
      setLoading(false);
      return;
    }

    if (!siteId && !entityId) {
      setLoading(false);
      return;
    }

    const loadSummary = async () => {
      setLoading(true);
      setError('');
      try {
        if (entityType && entityId) {
          const data = await getTaskSafetySummary(entityType, entityId);
          setSafetySummary(data);
          if (data.hasAcknowledged) {
            setHasAcknowledged(true);
            setAcknowledgedAt(data.acknowledgedAt);
          }
        }
      } catch (err) {
        setError('Unable to load safety information.');
        console.error('Safety Advisor load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [siteId, entityType, entityId, externalSummary]);

  // Check acknowledgement status if entityType and entityId are provided
  useEffect(() => {
    if (!entityType || !entityId || externalHasAcknowledged) return;

    const checkAckStatus = async () => {
      try {
        const status = await getAcknowledgementStatus(entityType, entityId);
        setHasAcknowledged(status.hasAcknowledged);
        setAcknowledgedAt(status.acknowledgedAt);
      } catch (err) {
        // Silently fail - acknowledgement status is not critical
      }
    };

    checkAckStatus();
  }, [entityType, entityId, externalHasAcknowledged]);

  // Handle acknowledgement
  const handleAcknowledge = async () => {
    if (!entityType || !entityId) {
      setError('Missing entity type or ID');
      return;
    }

    setAckLoading(true);
    setError(''); // Clear previous errors
    try {
      console.log(`[SafetyAdvisor] Attempting to acknowledge ${entityType}/${entityId}`);
      
      const result = await acknowledgeSafetyAdvisor(entityType, entityId, {
        safetySummarySnapshot: safetySummary
      });

      console.log(`[SafetyAdvisor] Acknowledgement result:`, result);

      // Check for success flag in response
      if (result.success || result.id || result.acknowledgedAt) {
        setHasAcknowledged(true);
        setAcknowledgedAt(result.acknowledgedAt || new Date().toISOString());

        // Call external callback if provided
        if (onAcknowledge) {
          onAcknowledge({
            entityType,
            entityId,
            acknowledgedAt: result.acknowledgedAt
          });
        }
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Acknowledgement error:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });

      // Handle specific error codes
      const status = err.response?.status;
      const serverError = err.response?.data?.error || err.response?.data?.message;

      if (status === 400) {
        setError(serverError || 'Invalid request. Please refresh and try again.');
      } else if (status === 403) {
        setError('You do not have permission to acknowledge this item.');
      } else if (status === 404) {
        setError('This item was not found. It may have been deleted.');
      } else if (status >= 500) {
        setError('Server error. Please contact support if this persists.');
      } else {
        setError(serverError || 'Unable to record acknowledgement. Please try again.');
      }
    } finally {
      setAckLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <div className="sa-skeleton">
      <div className="sa-skeleton-header">
        <div className="sa-skeleton-line sa-skeleton-title"></div>
        <div className="sa-skeleton-line sa-skeleton-pill"></div>
      </div>
      <div className="sa-skeleton-section">
        <div className="sa-skeleton-line sa-skeleton-full"></div>
        <div className="sa-skeleton-line sa-skeleton-medium"></div>
      </div>
      <div className="sa-skeleton-section">
        <div className="sa-skeleton-line sa-skeleton-full"></div>
        <div className="sa-skeleton-line sa-skeleton-short"></div>
        <div className="sa-skeleton-line sa-skeleton-short"></div>
      </div>
    </div>
  );

  // Weather section
  const renderWeather = () => {
    if (!safetySummary?.weather) return null;
    const { status, tempC, feelsLikeC, condition, icon, updatedAt, summaryText, windKph } = safetySummary.weather;

    if (status === 'loading') {
      return (
        <div className="sa-section sa-weather">
          <div className="sa-section-header" onClick={() => toggleSection('weather')}>
            <span className="sa-section-icon">🌤</span>
            <span className="sa-section-title">Weather</span>
          </div>
          <div className="sa-section-content">
            <div className="sa-spinner-container">
              <span className="sa-spinner"></span>
              <span>Fetching weather...</span>
            </div>
          </div>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="sa-section sa-weather sa-weather-error">
          <div className="sa-section-header" onClick={() => toggleSection('weather')}>
            <span className="sa-section-icon">⚠️</span>
            <span className="sa-section-title">Weather</span>
            <span className="sa-warning-badge">Unavailable</span>
          </div>
          {expandedSections.weather && (
            <div className="sa-section-content">
              <p className="sa-weather-fallback">
                Weather data is currently unavailable. Work to the safest known conditions.
              </p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="sa-section sa-weather">
        <div className="sa-section-header" onClick={() => toggleSection('weather')}>
          <span className="sa-section-icon">{icon || '🌤'}</span>
          <span className="sa-section-title">Weather</span>
          <span className="sa-weather-quick">{tempC}°C</span>
          <span className={`sa-expand-icon ${expandedSections.weather ? 'expanded' : ''}`}>▼</span>
        </div>
        {expandedSections.weather && (
          <div className="sa-section-content">
            <div className="sa-weather-details">
              <div className="sa-weather-main">
                <span className="sa-weather-temp">{tempC}°C</span>
                <span className="sa-weather-condition">{condition}</span>
              </div>
              <div className="sa-weather-extra">
                <span>Feels like {feelsLikeC}°C</span>
                {windKph && <span>Wind: {windKph} km/h</span>}
              </div>
              {summaryText && <p className="sa-weather-summary">{summaryText}</p>}
              <span className="sa-weather-updated">
                Updated {updatedAt ? new Date(updatedAt).toLocaleTimeString() : 'recently'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // PPE section
  const renderPPE = () => {
    if (!safetySummary?.ppeAdvice) return null;
    const { summary, items } = safetySummary.ppeAdvice;

    return (
      <div className="sa-section sa-ppe">
        <div className="sa-section-header" onClick={() => toggleSection('ppe')}>
          <span className="sa-section-icon">🦺</span>
          <span className="sa-section-title">PPE & Dressing</span>
          <span className="sa-ppe-count">{items?.length || 0}</span>
          <span className={`sa-expand-icon ${expandedSections.ppe ? 'expanded' : ''}`}>▼</span>
        </div>
        {expandedSections.ppe && (
          <div className="sa-section-content">
            {summary && <p className="sa-ppe-summary">{summary}</p>}
            <ul className="sa-ppe-list">
              {items?.map((item, idx) => (
                <li key={idx} className="sa-ppe-item">
                  <span className="sa-ppe-icon">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Safety Moment section
  const renderSafetyMoment = () => {
    if (!safetySummary?.safetyMoment) return null;
    const { title, body, category, acknowledged } = safetySummary.safetyMoment;
    const isAcknowledged = acknowledged || hasAcknowledged;

    return (
      <div className="sa-section sa-moment">
        <div className="sa-section-header" onClick={() => toggleSection('moment')}>
          <span className="sa-section-icon">💡</span>
          <span className="sa-section-title">Safety Moment</span>
          {category && <span className="sa-moment-category">{category}</span>}
          <span className={`sa-expand-icon ${expandedSections.moment ? 'expanded' : ''}`}>▼</span>
        </div>
        {expandedSections.moment && (
          <div className="sa-section-content">
            <div className="sa-moment-title">{title}</div>
            <div className="sa-moment-body">
              {showMoment ? body : body?.slice(0, 150) + (body?.length > 150 ? '...' : '')}
              {body?.length > 150 && (
                <button
                  className="sa-show-more-btn"
                  onClick={(e) => { e.stopPropagation(); setShowMoment(!showMoment); }}
                >
                  {showMoment ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>

            {isAcknowledged ? (
              <div className="sa-moment-acknowledged">
                <span className="sa-check-icon">✓</span>
                <span>Acknowledged {acknowledgedAt ? `on ${new Date(acknowledgedAt).toLocaleString()}` : ''}</span>
              </div>
            ) : (
              <div className="sa-moment-ack-prompt">
                <label className="sa-ack-checkbox">
                  <input type="checkbox" id="sa-moment-ack-check" />
                  <span>I have read and understood this Safety Moment</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Legislation section
  const renderLegislation = () => {
    if (!safetySummary?.legislation || safetySummary.legislation.length === 0) return null;

    return (
      <div className="sa-section sa-legislation">
        <div className="sa-section-header" onClick={() => toggleSection('legislation')}>
          <span className="sa-section-icon">📜</span>
          <span className="sa-section-title">Applicable Legislation</span>
          <span className="sa-legislation-count">{safetySummary.legislation.length}</span>
          <span className={`sa-expand-icon ${expandedSections.legislation ? 'expanded' : ''}`}>▼</span>
        </div>
        {expandedSections.legislation && (
          <div className="sa-section-content">
            <ul className="sa-legislation-list">
              {safetySummary.legislation.slice(0, 5).map((leg, idx) => (
                <li key={idx} className="sa-legislation-item">
                  <div className="sa-leg-main">
                    <span className="sa-leg-title">{leg.title}</span>
                    {leg.category && (
                      <span className={`sa-leg-category sa-leg-category-${leg.category}`}>
                        {leg.category}
                      </span>
                    )}
                  </div>
                  <div className="sa-leg-details">
                    {leg.refCode && <span className="sa-leg-ref">{leg.refCode}</span>}
                    {leg.linkUrl && (
                      <a
                        href={leg.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sa-leg-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View source →
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Acknowledgement section for high-risk workflows
  const renderAcknowledgement = () => {
    // Only show if we have entity context
    if (!entityType || !entityId) return null;

    const isHighRisk = requiresAcknowledgement || safetySummary?.isHighRisk;

    if (hasAcknowledged) {
      return (
        <div className="sa-acknowledgement sa-acknowledgement-complete">
          <span className="sa-ack-success-icon">✓</span>
          <div className="sa-ack-success-text">
            <span className="sa-ack-success-title">Safety Review Complete</span>
            <span className="sa-ack-success-time">
              Acknowledged {acknowledgedAt ? new Date(acknowledgedAt).toLocaleString() : 'recently'}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className={`sa-acknowledgement ${isHighRisk ? 'sa-acknowledgement-required' : ''}`}>
        {isHighRisk && (
          <div className="sa-high-risk-banner">
            <span className="sa-high-risk-icon">⚠️</span>
            <span className="sa-high-risk-text">
              High-risk work: Safety acknowledgement required
            </span>
          </div>
        )}
        <div className="sa-ack-action">
          <p className="sa-ack-prompt">
            {isHighRisk
              ? 'You must review and acknowledge the Safety Advisor before proceeding with high-risk work.'
              : 'Please acknowledge that you have reviewed the safety information above.'
            }
          </p>
          <button
            className={`sa-ack-btn ${isHighRisk ? 'sa-ack-btn-required' : ''}`}
            onClick={handleAcknowledge}
            disabled={ackLoading}
          >
            {ackLoading ? (
              <>
                <span className="sa-btn-spinner"></span>
                Saving...
              </>
            ) : (
              <>
                <span className="sa-ack-btn-icon">✓</span>
                Acknowledge Safety Review
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <aside className="safety-advisor-panel sa-loading" aria-label="Safety Advisor" aria-busy="true">
        <div className="sa-header">
          <span className="sa-header-icon">🛡️</span>
          <span className="sa-header-title">Safety Advisor</span>
        </div>
        {renderSkeleton()}
      </aside>
    );
  }

  // Error state (but still show what we have)
  if (error && !safetySummary) {
    return (
      <aside className="safety-advisor-panel sa-error-state" aria-label="Safety Advisor">
        <div className="sa-header">
          <span className="sa-header-icon">🛡️</span>
          <span className="sa-header-title">Safety Advisor</span>
        </div>
        <div className="sa-error-message">
          <span className="sa-error-icon">⚠️</span>
          <p>{error}</p>
          <button className="sa-retry-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </aside>
    );
  }

  // Main panel
  return (
    <aside
      className={`safety-advisor-panel ${requiresAcknowledgement && !hasAcknowledged ? 'sa-requires-ack' : ''}`}
      aria-label="Safety Advisor"
    >
      <div className="sa-header">
        <span className="sa-header-icon">🛡️</span>
        <span className="sa-header-title">Safety Advisor</span>
        {safetySummary?.siteName && (
          <span className="sa-site-pill">{safetySummary.siteName}</span>
        )}
        {requiresAcknowledgement && !hasAcknowledged && (
          <span className="sa-required-badge">Required</span>
        )}
      </div>

      <div className="sa-content">
        {renderWeather()}
        {renderPPE()}
        {renderSafetyMoment()}
        {renderLegislation()}
        {error && (
          <div className="sa-inline-error">
            <span>⚠️</span> {error}
          </div>
        )}
      </div>

      {renderAcknowledgement()}
    </aside>
  );
};

SafetyAdvisorPanel.propTypes = {
  siteId: PropTypes.string,
  entityType: PropTypes.oneOf(['incident', 'inspection', 'permit', 'action', 'training']),
  entityId: PropTypes.string,
  safetySummary: PropTypes.shape({
    siteName: PropTypes.string,
    siteLocation: PropTypes.string,
    isHighRisk: PropTypes.bool,
    hasAcknowledged: PropTypes.bool,
    acknowledgedAt: PropTypes.string,
    weather: PropTypes.shape({
      status: PropTypes.oneOf(['ok', 'loading', 'error']),
      tempC: PropTypes.number,
      feelsLikeC: PropTypes.number,
      condition: PropTypes.string,
      icon: PropTypes.string,
      windKph: PropTypes.number,
      updatedAt: PropTypes.string,
      summaryText: PropTypes.string
    }),
    ppeAdvice: PropTypes.shape({
      summary: PropTypes.string,
      items: PropTypes.arrayOf(PropTypes.string)
    }),
    safetyMoment: PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      body: PropTypes.string,
      category: PropTypes.string,
      acknowledged: PropTypes.bool
    }),
    legislation: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.string,
      refCode: PropTypes.string,
      category: PropTypes.string,
      linkUrl: PropTypes.string
    }))
  }),
  onAcknowledge: PropTypes.func,
  requiresAcknowledgement: PropTypes.bool,
  hasAcknowledged: PropTypes.bool
};

export default SafetyAdvisorPanel;
