import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { acknowledgeSafetyAdvisor } from '../../api/safetyAdvisor';
import './DashboardSafetyWidgets.css';

/**
 * DashboardSafetyMomentCard - Phase 11
 * Displays today's Safety Moment on the dashboard with acknowledge control
 * Test Case: TC-270-1, TC-271-1
 */
const DashboardSafetyMomentCard = ({ safetyMoment, siteName, siteId, onAcknowledge }) => {
  const [showFullBody, setShowFullBody] = useState(false);
  const [acknowledged, setAcknowledged] = useState(safetyMoment?.acknowledged || false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledgedAt, setAcknowledgedAt] = useState(safetyMoment?.acknowledgedAt || null);

  const handleAcknowledge = async () => {
    if (!safetyMoment?.id) return;

    setAcknowledging(true);
    try {
      const result = await acknowledgeSafetyAdvisor('safety-moment', safetyMoment.id, {
        siteId,
        channel: 'dashboard'
      });
      setAcknowledged(true);
      setAcknowledgedAt(result.acknowledgedAt || new Date().toISOString());
      if (onAcknowledge) {
        onAcknowledge({ safetyMomentId: safetyMoment.id, acknowledgedAt: result.acknowledgedAt });
      }
    } catch (err) {
      console.error('Failed to acknowledge safety moment:', err);
    } finally {
      setAcknowledging(false);
    }
  };

  if (!safetyMoment) {
    return (
      <div className="dashboard-safety-card dashboard-safety-empty">
        <div className="dashboard-safety-header">
          <span className="dashboard-safety-icon">💡</span>
          <h3 className="dashboard-safety-title">Today's Safety Moment</h3>
        </div>
        <p className="dashboard-safety-empty-text">
          No Safety Moment configured for today.
        </p>
      </div>
    );
  }

  const { title, body, category } = safetyMoment;
  const bodyPreview = body?.length > 150 ? body.slice(0, 150) + '...' : body;

  return (
    <div className="dashboard-safety-card dashboard-safety-moment-card">
      <div className="dashboard-safety-header">
        <span className="dashboard-safety-icon">💡</span>
        <h3 className="dashboard-safety-title">Today's Safety Moment</h3>
        {category && <span className="dashboard-safety-category">{category}</span>}
      </div>

      {siteName && (
        <p className="dashboard-safety-site">For your site: {siteName}</p>
      )}

      <div className="dashboard-moment-content">
        <h4 className="dashboard-moment-title">{title}</h4>
        <p className="dashboard-moment-body">
          {showFullBody ? body : bodyPreview}
        </p>
        {body?.length > 150 && (
          <button
            className="dashboard-moment-toggle"
            onClick={() => setShowFullBody(!showFullBody)}
          >
            {showFullBody ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      <div className="dashboard-moment-actions">
        {acknowledged ? (
          <div className="dashboard-moment-ack-success">
            <span className="dashboard-moment-check">✓</span>
            <span>Acknowledged {acknowledgedAt && `on ${new Date(acknowledgedAt).toLocaleDateString()}`}</span>
          </div>
        ) : (
          <button
            className="dashboard-moment-ack-btn"
            onClick={handleAcknowledge}
            disabled={acknowledging}
          >
            {acknowledging ? 'Saving...' : 'Acknowledge'}
          </button>
        )}
      </div>
    </div>
  );
};

DashboardSafetyMomentCard.propTypes = {
  safetyMoment: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    body: PropTypes.string,
    category: PropTypes.string,
    acknowledged: PropTypes.bool,
    acknowledgedAt: PropTypes.string
  }),
  siteName: PropTypes.string,
  siteId: PropTypes.string,
  onAcknowledge: PropTypes.func
};

export default DashboardSafetyMomentCard;
