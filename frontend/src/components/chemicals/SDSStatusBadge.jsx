import AppIcon from '../AppIcon';
import './SDSStatusBadge.css';

/**
 * SDS Status Badge Component
 * Shows the validity status of Safety Data Sheets
 */

const SDSStatusBadge = ({ expiryDate, hasDocument = true }) => {
  if (!hasDocument) {
    return (
      <span className="sds-status-badge sds-missing" title="No SDS uploaded">
        <span className="inline-icon"><AppIcon name="error" size={14} />No SDS</span>
      </span>
    );
  }

  if (!expiryDate) {
    return (
      <span className="sds-status-badge sds-unknown" title="No expiry date set">
        <span className="inline-icon"><AppIcon name="warning" size={14} />No Expiry</span>
      </span>
    );
  }

  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return (
      <span className="sds-status-badge sds-expired" title={`Expired ${Math.abs(daysUntilExpiry)} days ago`}>
        <span className="inline-icon"><AppIcon name="error" size={14} />Expired</span>
      </span>
    );
  }

  if (daysUntilExpiry <= 30) {
    return (
      <span className="sds-status-badge sds-expiring" title={`Expires in ${daysUntilExpiry} days`}>
        <span className="inline-icon"><AppIcon name="warning" size={14} />Exp {daysUntilExpiry}d</span>
      </span>
    );
  }

  const formattedDate = expiry.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  return (
    <span className="sds-status-badge sds-valid" title={`Valid until ${expiry.toLocaleDateString()}`}>
      <span className="inline-icon"><AppIcon name="check" size={14} />Valid ({formattedDate})</span>
    </span>
  );
};

export const SDSDocumentCard = ({ 
  fileName, 
  version, 
  isCurrent, 
  expiryDate, 
  uploadedAt, 
  onDownload, 
  onView 
}) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className={`sds-document-card ${isCurrent ? 'sds-current' : 'sds-superseded'}`}>
      <div className="sds-doc-icon">
        <AppIcon name="file" size={18} />
      </div>
      <div className="sds-doc-info">
        <div className="sds-doc-name">{fileName}</div>
        <div className="sds-doc-meta">
          {isCurrent ? (
            <span className="sds-current-badge">Current</span>
          ) : (
            <span className="sds-superseded-badge">Superseded</span>
          )}
          {version && <span>v{version}</span>}
          {expiryDate && <span>Exp: {formatDate(expiryDate)}</span>}
        </div>
      </div>
      <div className="sds-doc-actions">
        {onDownload && (
          <button className="btn ghost small" onClick={onDownload}>
            Download
          </button>
        )}
        {onView && (
          <button className="btn ghost small" onClick={onView}>
            View
          </button>
        )}
      </div>
    </div>
  );
};

export default SDSStatusBadge;
