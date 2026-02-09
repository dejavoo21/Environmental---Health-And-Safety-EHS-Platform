import './ChemicalStatusBadge.css';

/**
 * Chemical Status Badge Component
 * Shows the status of a chemical (Active, Phase Out, Banned)
 */

const CHEMICAL_STATUSES = {
  active: { label: 'Active', color: '#198754', bgColor: '#D1E7DD', icon: '●' },
  phase_out: { label: 'Phase Out', color: '#FD7E14', bgColor: '#FFE5D0', icon: '⚠' },
  banned: { label: 'Banned', color: '#DC3545', bgColor: '#F5C6CB', icon: '✕' }
};

const ChemicalStatusBadge = ({ status }) => {
  const statusInfo = CHEMICAL_STATUSES[status] || CHEMICAL_STATUSES.active;

  return (
    <span
      className="chemical-status-badge"
      style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
    >
      {statusInfo.icon} {statusInfo.label}
    </span>
  );
};

export default ChemicalStatusBadge;
