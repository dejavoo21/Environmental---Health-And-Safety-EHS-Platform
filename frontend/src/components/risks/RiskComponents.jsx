/**
 * Risk Components - Phase 9
 * Reusable components for Risk Register
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLevelColor, getLevelBgColor, getStatusLabel, getLikelihoodLabel, getImpactLabel } from '../../api/risks';
import AppIcon from '../AppIcon';
import './RiskComponents.css';

const getEntityIconName = (entityType) => {
  switch (entityType) {
    case 'incident': return 'alert';
    case 'action': return 'check';
    case 'inspection': return 'clipboard';
    case 'training': return 'graduation';
    case 'chemical': return 'flask';
    case 'permit': return 'document';
    default: return 'link';
  }
};
// ==================== BADGES ====================

/**
 * RiskLevelBadge - Colour-coded risk level indicator
 */
export const RiskLevelBadge = ({ level, score, size = 'medium' }) => {
  const levelUpper = level?.toUpperCase() || 'N/A';
  const color = getLevelColor(level);
  const bgColor = getLevelBgColor(level);
  
  return (
    <span 
      className={`risk-level-badge risk-level-badge--${size}`}
      style={{ backgroundColor: bgColor, borderColor: color, color: color }}
    >
      {score !== undefined && <span className="risk-level-score">{score}</span>}
      <span className="risk-level-label">{levelUpper}</span>
    </span>
  );
};

/**
 * RiskStatusBadge - Risk status indicator
 */
export const RiskStatusBadge = ({ status }) => {
  const statusClass = status?.toLowerCase().replace('_', '-') || 'unknown';
  
  return (
    <span className={`risk-status-badge risk-status-badge--${statusClass}`}>
      {getStatusLabel(status)}
    </span>
  );
};

// ==================== SCORE CARDS ====================

/**
 * RiskScoreCard - Score display with progress bar
 */
export const RiskScoreCard = ({ 
  title, 
  score, 
  level, 
  likelihood, 
  impact, 
  rationale,
  compact = false 
}) => {
  const color = getLevelColor(level);
  const bgColor = getLevelBgColor(level);
  const percentage = (score / 25) * 100;
  
  if (compact) {
    return (
      <div className="risk-score-card risk-score-card--compact" style={{ backgroundColor: bgColor }}>
        <div className="risk-score-card__header">
          <span className="risk-score-card__title">{title}</span>
        </div>
        <div className="risk-score-card__score" style={{ color }}>
          {score} <span className="risk-score-card__level">{level?.toUpperCase()}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="risk-score-card" style={{ backgroundColor: bgColor }}>
      <div className="risk-score-card__header">
        <span className="risk-score-card__title">{title}</span>
      </div>
      <div className="risk-score-card__score" style={{ color }}>
        {score} <span className="risk-score-card__level">{level?.toUpperCase()}</span>
      </div>
      <div className="risk-score-card__progress">
        <div 
          className="risk-score-card__progress-bar" 
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <div className="risk-score-card__formula">
        Likelihood: {likelihood} × Impact: {impact}
      </div>
      {rationale && (
        <div className="risk-score-card__rationale">
          <em>{rationale}</em>
        </div>
      )}
    </div>
  );
};

// ==================== SCORING SELECTOR ====================

/**
 * ScoringSelector - Likelihood/Impact selector with descriptions
 */
export const ScoringSelector = ({ 
  type, 
  value, 
  onChange, 
  error,
  required = false 
}) => {
  const isLikelihood = type === 'likelihood';
  const label = isLikelihood ? 'Likelihood' : 'Impact';
  
  const options = isLikelihood ? [
    { value: 1, label: 'Rare', description: '< once per 5 years' },
    { value: 2, label: 'Unlikely', description: 'once per 2-5 years' },
    { value: 3, label: 'Possible', description: 'once per 1-2 years' },
    { value: 4, label: 'Likely', description: 'once per year' },
    { value: 5, label: 'Almost Certain', description: 'multiple per year' }
  ] : [
    { value: 1, label: 'Negligible', description: 'no injury, < $10K' },
    { value: 2, label: 'Minor', description: 'first aid, $10-50K' },
    { value: 3, label: 'Moderate', description: 'medical treatment, $50-250K' },
    { value: 4, label: 'Major', description: 'serious injury, $250K-1M' },
    { value: 5, label: 'Catastrophic', description: 'fatality, > $1M' }
  ];
  
  return (
    <div className={`scoring-selector ${error ? 'scoring-selector--error' : ''}`}>
      <label className="scoring-selector__label">
        {label} {required && <span className="required">*</span>}
      </label>
      <div className="scoring-selector__options">
        {options.map((opt) => (
          <label key={opt.value} className="scoring-selector__option">
            <input
              type="radio"
              name={type}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span className="scoring-selector__option-content">
              <span className="scoring-selector__option-value">{opt.value}</span>
              <span className="scoring-selector__option-label">{opt.label}</span>
              <span className="scoring-selector__option-desc">({opt.description})</span>
            </span>
          </label>
        ))}
      </div>
      {error && <span className="scoring-selector__error">{error}</span>}
    </div>
  );
};

// ==================== HEATMAP ====================

/**
 * RiskHeatmapCell - Individual matrix cell
 */
export const RiskHeatmapCell = ({ 
  likelihood, 
  impact, 
  count, 
  level, 
  onClick,
  isSelected = false
}) => {
  const color = getLevelColor(level);
  const bgColor = getLevelBgColor(level);
  
  return (
    <button
      className={`heatmap-cell ${isSelected ? 'heatmap-cell--selected' : ''}`}
      style={{ 
        backgroundColor: bgColor, 
        borderColor: color,
        outline: isSelected ? `2px solid ${color}` : 'none'
      }}
      onClick={() => onClick && onClick(likelihood, impact)}
      title={`L${likelihood} × I${impact} = ${likelihood * impact} (${level?.toUpperCase() || 'N/A'})`}
    >
      {count > 0 ? count : ''}
    </button>
  );
};

/**
 * RiskHeatmap - 5×5 matrix visualisation
 */
export const RiskHeatmap = ({ 
  data, 
  onCellClick, 
  selectedCell = null,
  scoreType = 'residual'
}) => {
  const getCellData = (likelihood, impact) => {
    const cell = data?.cells?.find(c => c.likelihood === likelihood && c.impact === impact);
    return {
      count: cell?.count || 0,
      level: cell?.level || 'low',
      risks: cell?.risks || []
    };
  };
  
  const likelihoodLabels = ['Almost Certain', 'Likely', 'Possible', 'Unlikely', 'Rare'];
  const impactLabels = ['Neg.', 'Minor', 'Mod.', 'Major', 'Cat.'];
  
  return (
    <div className="risk-heatmap">
      <div className="risk-heatmap__title">
        {scoreType === 'inherent' ? 'Inherent' : 'Residual'} Risk Matrix
      </div>
      
      <div className="risk-heatmap__container">
        <div className="risk-heatmap__y-axis-label">LIKELIHOOD</div>
        
        <div className="risk-heatmap__grid">
          {/* Header row - Impact labels */}
          <div className="risk-heatmap__corner"></div>
          {[1, 2, 3, 4, 5].map((impact) => (
            <div key={`header-${impact}`} className="risk-heatmap__header">
              <div className="risk-heatmap__header-value">{impact}</div>
              <div className="risk-heatmap__header-label">{impactLabels[impact - 1]}</div>
            </div>
          ))}
          
          {/* Matrix rows */}
          {[5, 4, 3, 2, 1].map((likelihood) => (
            <>
              <div key={`row-${likelihood}`} className="risk-heatmap__row-label">
                <div className="risk-heatmap__row-value">{likelihood}</div>
                <div className="risk-heatmap__row-text">{likelihoodLabels[5 - likelihood]}</div>
              </div>
              {[1, 2, 3, 4, 5].map((impact) => {
                const cellData = getCellData(likelihood, impact);
                const isSelected = selectedCell?.likelihood === likelihood && selectedCell?.impact === impact;
                return (
                  <RiskHeatmapCell
                    key={`cell-${likelihood}-${impact}`}
                    likelihood={likelihood}
                    impact={impact}
                    count={cellData.count}
                    level={cellData.level}
                    onClick={onCellClick}
                    isSelected={isSelected}
                  />
                );
              })}
            </>
          ))}
        </div>
        
        <div className="risk-heatmap__x-axis-label">IMPACT</div>
      </div>
      
      <div className="risk-heatmap__legend">
        <span className="risk-heatmap__legend-item">
          <span className="legend-color" style={{ backgroundColor: '#E8F5E9', borderColor: '#4CAF50' }}></span>
          LOW (1-4)
        </span>
        <span className="risk-heatmap__legend-item">
          <span className="legend-color" style={{ backgroundColor: '#FFFDE7', borderColor: '#FFEB3B' }}></span>
          MEDIUM (5-9)
        </span>
        <span className="risk-heatmap__legend-item">
          <span className="legend-color" style={{ backgroundColor: '#FFF3E0', borderColor: '#FF9800' }}></span>
          HIGH (10-16)
        </span>
        <span className="risk-heatmap__legend-item">
          <span className="legend-color" style={{ backgroundColor: '#FFEBEE', borderColor: '#F44336' }}></span>
          EXTREME (17-25)
        </span>
      </div>
    </div>
  );
};

// ==================== CONTROL CARD ====================

/**
 * ControlCard - Control display with actions
 */
export const ControlCard = ({ 
  control, 
  index, 
  onEdit, 
  onDelete, 
  onVerify,
  canEdit = true 
}) => {
  const getTypeLabel = (type) => {
    return type === 'prevention' ? 'Preventive' : 'Corrective';
  };
  
  const getHierarchyLabel = (hierarchy) => {
    const labels = {
      elimination: 'Elimination',
      substitution: 'Substitution',
      engineering: 'Engineering',
      administrative: 'Administrative',
      ppe: 'PPE'
    };
    return labels[hierarchy] || hierarchy;
  };
  
  const getEffectivenessClass = (effectiveness) => {
    switch (effectiveness) {
      case 'effective': return 'control-effectiveness--effective';
      case 'partially_effective': return 'control-effectiveness--partial';
      case 'ineffective': return 'control-effectiveness--ineffective';
      default: return 'control-effectiveness--unknown';
    }
  };
  
  const getEffectivenessLabel = (effectiveness) => {
    const labels = {
      effective: '✓ Effective',
      partially_effective: '⚠ Partial',
      ineffective: '✗ Ineffective',
      unknown: '? Not Evaluated'
    };
    return labels[effectiveness] || effectiveness;
  };
  
  return (
    <div className="control-card">
      <div className="control-card__header">
        <div className="control-card__index">{index + 1}</div>
        <div className="control-card__description">{control.description}</div>
      </div>
      
      <div className="control-card__badges">
        <span className="control-card__badge control-card__badge--type">
          {getTypeLabel(control.type)}
        </span>
        <span className="control-card__badge control-card__badge--hierarchy">
          {getHierarchyLabel(control.hierarchy)}
        </span>
        <span className={`control-card__badge ${getEffectivenessClass(control.effectiveness)}`}>
          {getEffectivenessLabel(control.effectiveness)}
        </span>
      </div>
      
      <div className="control-card__details">
        <div className="control-card__owner">
          Owner: {control.owner_name || 'Unassigned'}
        </div>
        {control.implemented_date && (
          <div className="control-card__dates">
            Implemented: {new Date(control.implemented_date).toLocaleDateString()}
            {control.last_verified_at && (
              <> | Last Verified: {new Date(control.last_verified_at).toLocaleDateString()}</>
            )}
          </div>
        )}
      </div>
      
      {control.linked_entities?.length > 0 && (
        <div className="control-card__links">
          <strong>Linked to:</strong>
          {control.linked_entities.map((link, i) => (
            <span key={i} className="control-card__link-item">\n              <AppIcon name={getEntityIconName(link.entity_type)} size={14} />\n              {link.entity_title || link.entity_id}\n            </span>
          ))}
        </div>
      )}
      
      {canEdit && (
        <div className="control-card__actions">
          {onVerify && (
            <button className="btn btn--small btn--ghost" onClick={() => onVerify(control)}>
              Verify
            </button>
          )}
          {onEdit && (
            <button className="btn btn--small btn--ghost" onClick={() => onEdit(control)}>
              Edit
            </button>
          )}
          {onDelete && (
            <button className="btn btn--small btn--ghost btn--danger" onClick={() => onDelete(control)}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== LINK CARD ====================

/**
 * LinkCard - Linked entity display
 */
export const LinkCard = ({ link, onUnlink, canEdit = true }) => {
  const navigate = useNavigate();
  
  const getEntityIconName = (entityType) => {
    switch (entityType) {
      case 'incident': return 'alert';
      case 'action': return 'check';
      case 'inspection': return 'clipboard';
      case 'training': return 'graduation';
      case 'chemical': return 'flask';
      case 'permit': return 'document';
      default: return 'link';
    }
  };
  
  const getEntityPath = (entityType, entityId) => {
    switch (entityType) {
      case 'incident': return `/incidents/${entityId}`;
      case 'action': return `/actions/${entityId}`;
      case 'inspection': return `/inspections/${entityId}`;
      case 'training': return `/training/courses/${entityId}`;
      case 'chemical': return `/chemicals/${entityId}`;
      case 'permit': return `/permits/${entityId}`;
      default: return null;
    }
  };
  
  const path = getEntityPath(link.entity_type, link.entity_id);
  
  return (
    <div className="link-card">
      <div className="link-card__header">
        <span className="link-card__icon"><AppIcon name={getEntityIconName(link.entity_type)} size={16} /></span>
        {path ? (
          <button 
            className="link-card__title link-card__title--clickable"
            onClick={() => navigate(path)}
          >
            {link.entity_reference || link.entity_id}: {link.entity_title || 'Untitled'}
          </button>
        ) : (
          <span className="link-card__title">
            {link.entity_reference || link.entity_id}: {link.entity_title || 'Untitled'}
          </span>
        )}
      </div>
      
      <div className="link-card__details">
        {link.entity_status && (
          <span className="link-card__status">Status: {link.entity_status}</span>
        )}
        {link.linked_at && (
          <span className="link-card__date">
            Linked: {new Date(link.linked_at).toLocaleDateString()}
          </span>
        )}
      </div>
      
      {link.link_reason && (
        <div className="link-card__reason">
          <em>{link.link_reason}</em>
        </div>
      )}
      
      {canEdit && onUnlink && (
        <button 
          className="link-card__unlink btn btn--small btn--ghost"
          onClick={() => onUnlink(link)}
        >
          Unlink
        </button>
      )}
    </div>
  );
};

// ==================== REVIEW CARD ====================

/**
 * ReviewCard - Review history item
 */
export const ReviewCard = ({ review }) => {
  const getOutcomeClass = (outcome) => {
    switch (outcome) {
      case 'improved': return 'review-outcome--improved';
      case 'deteriorated': return 'review-outcome--deteriorated';
      case 'no_change': return 'review-outcome--unchanged';
      case 'recommend_close': return 'review-outcome--close';
      default: return '';
    }
  };
  
  const getOutcomeLabel = (outcome) => {
    const labels = {
      improved: 'Improved',
      deteriorated: 'Deteriorated',
      no_change: 'No Change',
      recommend_close: 'Recommend Close'
    };
    return labels[outcome] || outcome;
  };
  
  const formatScoreChange = (before, after) => {
    if (before === after) return `${after} (unchanged)`;
    const arrow = after < before ? '↓' : '↑';
    return `${before} → ${after} ${arrow}`;
  };
  
  return (
    <div className="review-card">
      <div className="review-card__header">
        <span className="review-card__date">
          {new Date(review.review_date).toLocaleDateString()}
        </span>
        <span className="review-card__reviewer">
          • {review.reviewer_name || 'Unknown'}
        </span>
        <span className={`review-card__outcome ${getOutcomeClass(review.outcome)}`}>
          {getOutcomeLabel(review.outcome)}
        </span>
      </div>
      
      <div className="review-card__scores">
        <span className="review-card__score">
          Inherent: {review.inherent_score_snapshot} (unchanged)
        </span>
        <span className="review-card__score">
          Residual: {formatScoreChange(
            review.previous_residual_score || review.residual_score_snapshot,
            review.residual_score_snapshot
          )}
        </span>
      </div>
      
      {review.controls_reviewed && (
        <div className="review-card__controls">
          Controls Reviewed: {review.controls_reviewed}
        </div>
      )}
      
      {review.notes && (
        <div className="review-card__notes">
          {review.notes}
        </div>
      )}
    </div>
  );
};

// ==================== RISK FILTERS ====================

/**
 * RiskFilters - Filter controls for risk list
 */
export const RiskFilters = ({
  filters,
  onFilterChange,
  categories = [],
  sites = [],
  users = [],
  onClear
}) => {
  return (
    <div className="risk-filters">
      <div className="risk-filters__row">
        <label className="risk-filters__field">
          Status
          <select
            value={filters.status || ''}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="emerging">Emerging</option>
            <option value="active">Active</option>
            <option value="under_review">Under Review</option>
            <option value="closed">Closed</option>
            <option value="accepted">Accepted</option>
          </select>
        </label>
        
        <label className="risk-filters__field">
          Category
          <select
            value={filters.categoryId || ''}
            onChange={(e) => onFilterChange('categoryId', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </label>
        
        <label className="risk-filters__field">
          Site
          <select
            value={filters.siteId || ''}
            onChange={(e) => onFilterChange('siteId', e.target.value)}
          >
            <option value="">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </label>
        
        <label className="risk-filters__field">
          Level
          <select
            value={filters.level || ''}
            onChange={(e) => onFilterChange('level', e.target.value)}
          >
            <option value="">All Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="extreme">Extreme</option>
          </select>
        </label>
        
        <label className="risk-filters__field risk-filters__field--search">
          Search
          <input
            type="text"
            placeholder="Search by title or reference..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
        </label>
      </div>
      
      {Object.values(filters).some(v => v) && (
        <button className="risk-filters__clear btn btn--ghost" onClick={onClear}>
          Clear Filters
        </button>
      )}
    </div>
  );
};

// ==================== SUMMARY CARDS ====================

/**
 * RiskSummaryCards - Summary statistics for risk register
 */
export const RiskSummaryCards = ({ summary }) => {
  return (
    <div className="risk-summary-cards">
      <div className="risk-summary-card">
        <div className="risk-summary-card__value">{summary?.total || 0}</div>
        <div className="risk-summary-card__label">Total Risks</div>
      </div>
      <div className="risk-summary-card risk-summary-card--extreme">
        <div className="risk-summary-card__value">{summary?.extreme || 0}</div>
        <div className="risk-summary-card__label">Extreme</div>
      </div>
      <div className="risk-summary-card risk-summary-card--high">
        <div className="risk-summary-card__value">{summary?.high || 0}</div>
        <div className="risk-summary-card__label">High</div>
      </div>
      <div className="risk-summary-card risk-summary-card--medium">
        <div className="risk-summary-card__value">{summary?.medium || 0}</div>
        <div className="risk-summary-card__label">Medium</div>
      </div>
      <div className="risk-summary-card risk-summary-card--reviews">
        <div className="risk-summary-card__value">{summary?.reviewsDue || 0}</div>
        <div className="risk-summary-card__label">Reviews Due</div>
      </div>
    </div>
  );
};



