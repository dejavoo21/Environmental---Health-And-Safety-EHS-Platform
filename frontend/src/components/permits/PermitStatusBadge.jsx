import { PERMIT_STATUSES } from '../../api/permits';
import './PermitStatusBadge.css';

/**
 * Permit Status Badge Component
 * Shows the status of a permit with color coding
 */

const PermitStatusBadge = ({ status }) => {
  const statusInfo = PERMIT_STATUSES[status] || { label: status, color: '#6C757D', bgColor: '#E9ECEF' };

  return (
    <span
      className="permit-status-badge"
      style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
    >
      {statusInfo.label}
    </span>
  );
};

export default PermitStatusBadge;
