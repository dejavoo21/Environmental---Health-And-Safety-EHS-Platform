import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import './DashboardSafetyWidgets.css';

/**
 * DashboardUpcomingSafetyCard - Phase 11
 * Shows upcoming work with weather/condition summary for each entry
 * Test Case: TC-275-1
 */
const DashboardUpcomingSafetyCard = ({ upcomingWork, onViewAll }) => {
  const navigate = useNavigate();

  const handleItemClick = (item) => {
    if (item.link) {
      navigate(item.link);
    } else if (item.cta?.onClick) {
      item.cta.onClick();
    }
  };

  const getRiskClass = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high':
      case 'extreme':
        return 'risk-high';
      case 'medium':
        return 'risk-medium';
      case 'low':
      default:
        return 'risk-low';
    }
  };

  if (!upcomingWork || !upcomingWork.length) {
    return (
      <div className="dashboard-safety-card dashboard-upcoming-card dashboard-safety-empty">
        <div className="dashboard-safety-header">
          <span className="dashboard-safety-icon">📋</span>
          <h3 className="dashboard-safety-title">Upcoming Work</h3>
        </div>
        <p className="dashboard-safety-empty-text">
          No upcoming work items for the next 72 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-safety-card dashboard-upcoming-card">
      <div className="dashboard-safety-header">
        <span className="dashboard-safety-icon">📋</span>
        <h3 className="dashboard-safety-title">Upcoming Work</h3>
        <span className="dashboard-upcoming-count">{upcomingWork.length}</span>
      </div>

      <ul className="dashboard-upcoming-list">
        {upcomingWork.slice(0, 4).map((item, idx) => (
          <li
            key={idx}
            className="dashboard-upcoming-item"
            onClick={() => handleItemClick(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleItemClick(item); }}
          >
            <div className="dashboard-upcoming-main">
              <span className="dashboard-upcoming-type">{item.type || 'Task'}</span>
              <span className="dashboard-upcoming-site">{item.siteName}</span>
            </div>

            <div className="dashboard-upcoming-details">
              {item.weatherIcon && (
                <span className="dashboard-upcoming-weather">
                  {item.weatherIcon} {item.tempC}°C
                </span>
              )}
              {item.condition && (
                <span className="dashboard-upcoming-condition">{item.condition}</span>
              )}
              {item.riskLabel && (
                <span className={`dashboard-upcoming-risk ${getRiskClass(item.riskLabel)}`}>
                  {item.riskLabel}
                </span>
              )}
            </div>

            {item.scheduledFor && (
              <span className="dashboard-upcoming-time">
                {new Date(item.scheduledFor).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            )}
          </li>
        ))}
      </ul>

      {upcomingWork.length > 4 && (
        <button
          className="dashboard-upcoming-view-all"
          onClick={onViewAll || (() => navigate('/actions'))}
        >
          View all {upcomingWork.length} items
        </button>
      )}
    </div>
  );
};

DashboardUpcomingSafetyCard.propTypes = {
  upcomingWork: PropTypes.arrayOf(PropTypes.shape({
    siteName: PropTypes.string,
    type: PropTypes.string,
    weatherIcon: PropTypes.string,
    tempC: PropTypes.number,
    condition: PropTypes.string,
    riskLabel: PropTypes.string,
    scheduledFor: PropTypes.string,
    link: PropTypes.string,
    cta: PropTypes.shape({
      label: PropTypes.string,
      onClick: PropTypes.func
    })
  })),
  onViewAll: PropTypes.func
};

export default DashboardUpcomingSafetyCard;
