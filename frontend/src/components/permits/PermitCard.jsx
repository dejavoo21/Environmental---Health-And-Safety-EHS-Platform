import { getPermitTypeIcon } from '../../api/permits';
import PermitStatusBadge from './PermitStatusBadge';
import { CountdownBadge } from './CountdownTimer';
import AppIcon from '../AppIcon';
import './PermitCard.css';

/**
 * Permit Card Component
 * Summary card for permit board display
 */

const PermitCard = ({ 
  permit, 
  onView, 
  onApprove, 
  onReject, 
  onActivate, 
  onSuspend, 
  onClose,
  canManage = false
}) => {
  const {
    permitNumber,
    permitType,
    locationDescription,
    workers = [],
    status,
    validUntil
  } = permit;

  const typeIcon = getPermitTypeIcon(permitType?.code);
  const typeName = permitType?.name || 'Permit';
  const workerCount = workers.length;
  const primaryWorker = workers[0];

  // Determine card urgency based on time remaining
  let cardUrgency = '';
  if (status === 'active' && validUntil) {
    const now = new Date();
    const expiry = new Date(validUntil);
    const diff = expiry - now;
    
    if (diff <= 0) {
      cardUrgency = 'permit-card-expired';
    } else if (diff <= 30 * 60 * 1000) {
      cardUrgency = 'permit-card-critical';
    } else if (diff <= 2 * 60 * 60 * 1000) {
      cardUrgency = 'permit-card-warning';
    }
  }

  return (
    <div className={`permit-card ${cardUrgency}`}>
      <div className="permit-card-header">
        <span className="permit-type-icon">
          <AppIcon name={typeIcon || 'clipboard'} size={16} />
        </span>
        <span className="permit-type-name">{typeName.toUpperCase()}</span>
      </div>
      
      <div className="permit-card-number">{permitNumber}</div>
      
      <div className="permit-card-location">
        <span className="location-icon">
          <AppIcon name="mappin" size={16} />
        </span>
        {locationDescription || 'No location specified'}
      </div>
      
      {workerCount > 0 && (
        <div className="permit-card-workers">
          <span className="workers-icon">
            <AppIcon name="hardhat" size={16} />
          </span>
          {primaryWorker?.workerName || primaryWorker?.user?.firstName}
          {workerCount > 1 && ` + ${workerCount - 1} worker${workerCount > 2 ? 's' : ''}`}
        </div>
      )}
      
      {status === 'active' && validUntil && (
        <div className="permit-card-countdown">
          <CountdownBadge validUntil={validUntil} />
        </div>
      )}
      
      {status !== 'active' && (
        <div className="permit-card-status">
          <PermitStatusBadge status={status} />
        </div>
      )}
      
      <div className="permit-card-actions">
        <button className="btn ghost small" onClick={() => onView(permit)}>
          View
        </button>
        
        {canManage && status === 'submitted' && onApprove && (
          <button className="btn primary small" onClick={() => onApprove(permit)}>
            Approve
          </button>
        )}
        
        {canManage && status === 'submitted' && onReject && (
          <button className="btn ghost small" onClick={() => onReject(permit)}>
            Reject
          </button>
        )}
        
        {canManage && status === 'approved' && onActivate && (
          <button className="btn primary small" onClick={() => onActivate(permit)}>
            Activate
          </button>
        )}
        
        {canManage && status === 'active' && onSuspend && (
          <button className="btn ghost small" onClick={() => onSuspend(permit)}>
            Suspend
          </button>
        )}
        
        {canManage && status === 'active' && onClose && (
          <button className="btn primary small" onClick={() => onClose(permit)}>
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default PermitCard;
