import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import SafetyAdvisorPanel from './SafetyAdvisorPanel';
import { getTaskSafetySummary, acknowledgeSafetyAdvisor } from '../../api/safetyAdvisor';
import './PreTaskSafetyAdvisor.css';

/**
 * PreTaskSafetyAdvisor - Phase 11
 *
 * Pre-task safety view for My Actions and Training pages.
 * Shows a condensed safety overview that must be reviewed before starting work.
 *
 * Features:
 * - Collapsible overview mode or full SafetyAdvisorPanel
 * - Quick-acknowledge for low-risk tasks
 * - Forced acknowledgement for high-risk tasks
 * - Today's Safety Moment with acknowledgement
 *
 * Test Cases: TC-275-1, TC-276-3
 */
const PreTaskSafetyAdvisor = ({
  siteId,
  entityType,
  entityId,
  safetySummary: externalSummary,
  onAcknowledge,
  requiresAcknowledgement = false,
  mode = 'compact', // 'compact' | 'full'
  showHeader = true,
  title = 'Pre-Task Safety Review'
}) => {
  const [safetySummary, setSafetySummary] = useState(externalSummary || null);
  const [loading, setLoading] = useState(!externalSummary);
  const [error, setError] = useState('');
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [acknowledgedAt, setAcknowledgedAt] = useState(null);
  const [ackLoading, setAckLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [momentChecked, setMomentChecked] = useState(false);

  // Fetch safety summary if not provided
  useEffect(() => {
    if (externalSummary) {
      setSafetySummary(externalSummary);
      setHasAcknowledged(externalSummary.hasAcknowledged || false);
      setAcknowledgedAt(externalSummary.acknowledgedAt || null);
      setLoading(false);
      return;
    }

    if (!entityType || !entityId) {
      setLoading(false);
      return;
    }

    const loadSafety = async () => {
      setLoading(true);
      try {
        const data = await getTaskSafetySummary(entityType, entityId);
        setSafetySummary(data);
        setHasAcknowledged(data.hasAcknowledged || false);
        setAcknowledgedAt(data.acknowledgedAt || null);
      } catch (err) {
        setError('Unable to load safety information.');
        console.error('PreTaskSafetyAdvisor load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSafety();
  }, [siteId, entityType, entityId, externalSummary]);

  // Handle acknowledgement
  const handleAcknowledge = async () => {
    if (!entityType || !entityId) return;

    // For tasks with safety moment, require checkbox
    if (safetySummary?.safetyMoment && !momentChecked) {
      setError('Please confirm you have read the Safety Moment');
      return;
    }

    setAckLoading(true);
    setError('');
    try {
      const result = await acknowledgeSafetyAdvisor(entityType, entityId, {
        safetySummarySnapshot: safetySummary,
        channel: 'pre-task'
      });
      setHasAcknowledged(true);
      setAcknowledgedAt(result.acknowledgedAt || new Date().toISOString());

      if (onAcknowledge) {
        onAcknowledge({
          entityType,
          entityId,
          acknowledgedAt: result.acknowledgedAt
        });
      }
    } catch (err) {
      setError('Unable to record acknowledgement. Please try again.');
      console.error('PreTask acknowledgement error:', err);
    } finally {
      setAckLoading(false);
    }
  };

  const isHighRisk = requiresAcknowledgement || safetySummary?.isHighRisk;

  // Compact quick view
  const renderCompactView = () => {
    if (loading) {
      return (
        <div className="pretask-compact pretask-loading">
          <div className="pretask-skeleton">
            <div className="pretask-skeleton-line"></div>
            <div className="pretask-skeleton-line short"></div>
          </div>
        </div>
      );
    }

    if (hasAcknowledged) {
      return (
        <div className="pretask-compact pretask-acknowledged">
          <div className="pretask-ack-success">
            <span className="pretask-check">✓</span>
            <div className="pretask-ack-info">
              <span className="pretask-ack-title">Safety Review Complete</span>
              <span className="pretask-ack-time">
                {acknowledgedAt ? new Date(acknowledgedAt).toLocaleString() : 'Just now'}
              </span>
            </div>
          </div>
          {safetySummary?.weather && (
            <div className="pretask-weather-pill">
              <span>{safetySummary.weather.icon || '🌤'}</span>
              <span>{safetySummary.weather.tempC}°C</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`pretask-compact ${isHighRisk ? 'pretask-high-risk' : ''}`}>
        {isHighRisk && (
          <div className="pretask-warning-banner">
            <span>⚠️</span>
            <span>High-risk work - Review required before starting</span>
          </div>
        )}

        <div className="pretask-quick-info">
          {/* Weather */}
          {safetySummary?.weather && safetySummary.weather.status === 'ok' && (
            <div className="pretask-info-item pretask-weather">
              <span className="pretask-icon">{safetySummary.weather.icon || '🌤'}</span>
              <div className="pretask-info-text">
                <span className="pretask-info-value">{safetySummary.weather.tempC}°C</span>
                <span className="pretask-info-label">{safetySummary.weather.condition}</span>
              </div>
            </div>
          )}

          {/* PPE count */}
          {safetySummary?.ppeAdvice?.items?.length > 0 && (
            <div className="pretask-info-item pretask-ppe">
              <span className="pretask-icon">🦺</span>
              <div className="pretask-info-text">
                <span className="pretask-info-value">{safetySummary.ppeAdvice.items.length}</span>
                <span className="pretask-info-label">PPE required</span>
              </div>
            </div>
          )}

          {/* Safety Moment indicator */}
          {safetySummary?.safetyMoment && (
            <div className="pretask-info-item pretask-moment">
              <span className="pretask-icon">💡</span>
              <div className="pretask-info-text">
                <span className="pretask-info-value">Today's Moment</span>
                <span className="pretask-info-label">{safetySummary.safetyMoment.category || 'Safety'}</span>
              </div>
            </div>
          )}

          <button
            className="pretask-expand-btn"
            onClick={() => setExpanded(true)}
            aria-expanded={expanded}
          >
            View Details
          </button>
        </div>

        {/* Safety Moment acknowledgement */}
        {safetySummary?.safetyMoment && (
          <div className="pretask-moment-preview">
            <div className="pretask-moment-title">{safetySummary.safetyMoment.title}</div>
            <label className="pretask-moment-check">
              <input
                type="checkbox"
                checked={momentChecked}
                onChange={(e) => setMomentChecked(e.target.checked)}
              />
              <span>I have read and understood this Safety Moment</span>
            </label>
          </div>
        )}

        {error && <div className="pretask-error">{error}</div>}

        <div className="pretask-actions">
          <button
            className={`pretask-ack-btn ${isHighRisk ? 'required' : ''}`}
            onClick={handleAcknowledge}
            disabled={ackLoading || (safetySummary?.safetyMoment && !momentChecked)}
          >
            {ackLoading ? (
              <>
                <span className="pretask-spinner"></span>
                Saving...
              </>
            ) : (
              <>
                <span>✓</span>
                {isHighRisk ? 'Acknowledge & Proceed' : 'Quick Acknowledge'}
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Full SafetyAdvisorPanel mode or expanded view
  if (mode === 'full' || expanded) {
    return (
      <div className="pretask-safety-advisor pretask-full">
        {showHeader && (
          <div className="pretask-header">
            <h3>{title}</h3>
            {mode === 'compact' && expanded && (
              <button
                className="pretask-collapse-btn"
                onClick={() => setExpanded(false)}
              >
                ← Back to summary
              </button>
            )}
          </div>
        )}
        <div className="pretask-instruction">
          Review the safety information below before starting your task.
        </div>
        <SafetyAdvisorPanel
          siteId={siteId}
          entityType={entityType}
          entityId={entityId}
          safetySummary={safetySummary}
          onAcknowledge={(data) => {
            setHasAcknowledged(true);
            setAcknowledgedAt(data.acknowledgedAt);
            if (onAcknowledge) onAcknowledge(data);
          }}
          requiresAcknowledgement={isHighRisk}
          hasAcknowledged={hasAcknowledged}
        />
      </div>
    );
  }

  // Compact mode
  return (
    <div className={`pretask-safety-advisor pretask-compact-mode ${hasAcknowledged ? 'acknowledged' : ''}`}>
      {showHeader && !hasAcknowledged && (
        <div className="pretask-header">
          <span className="pretask-header-icon">🛡️</span>
          <h3>{title}</h3>
        </div>
      )}
      {renderCompactView()}
    </div>
  );
};

PreTaskSafetyAdvisor.propTypes = {
  siteId: PropTypes.string,
  entityType: PropTypes.oneOf(['action', 'training', 'permit', 'inspection']),
  entityId: PropTypes.string,
  safetySummary: PropTypes.object,
  onAcknowledge: PropTypes.func,
  requiresAcknowledgement: PropTypes.bool,
  mode: PropTypes.oneOf(['compact', 'full']),
  showHeader: PropTypes.bool,
  title: PropTypes.string
};

export default PreTaskSafetyAdvisor;
