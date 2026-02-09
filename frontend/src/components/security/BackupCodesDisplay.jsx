import { useState } from 'react';
import PropTypes from 'prop-types';

const BackupCodesDisplay = ({ codes = [], onDownload, onCopy, onPrint }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = codes.map((code, i) => `${i + 1}. ${code}`).join('\n');
    
    if (onCopy) {
      await onCopy(text);
    } else {
      await navigator.clipboard.writeText(text);
    }
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = [
      'EHS Portal - Two-Factor Authentication Backup Codes',
      '================================================',
      '',
      'Keep these codes in a safe place. Each code can only be used once.',
      '',
      ...codes.map((code, i) => `${i + 1}. ${code}`),
      '',
      `Generated: ${new Date().toISOString()}`
    ].join('\n');

    if (onDownload) {
      onDownload(text);
    } else {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ehs-portal-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  if (!codes.length) {
    return null;
  }

  const midpoint = Math.ceil(codes.length / 2);
  const leftColumn = codes.slice(0, midpoint);
  const rightColumn = codes.slice(midpoint);

  return (
    <div className="backup-codes-display" data-testid="backup-codes-display">
      <div className="backup-codes-grid">
        <div className="backup-codes-column">
          {leftColumn.map((code, index) => (
            <div key={code} className="backup-code-item">
              <span className="backup-code-number">{index + 1}.</span>
              <code className="backup-code-value">{code}</code>
            </div>
          ))}
        </div>
        <div className="backup-codes-column">
          {rightColumn.map((code, index) => (
            <div key={code} className="backup-code-item">
              <span className="backup-code-number">{midpoint + index + 1}.</span>
              <code className="backup-code-value">{code}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="backup-codes-actions">
        <button
          type="button"
          className="btn secondary small"
          onClick={handleDownload}
          data-testid="download-codes-btn"
        >
          Download as TXT
        </button>
        <button
          type="button"
          className="btn secondary small"
          onClick={handleCopy}
          data-testid="copy-codes-btn"
        >
          {copied ? 'Copied!' : 'Copy All'}
        </button>
        <button
          type="button"
          className="btn secondary small"
          onClick={handlePrint}
          data-testid="print-codes-btn"
        >
          Print
        </button>
      </div>
    </div>
  );
};

BackupCodesDisplay.propTypes = {
  codes: PropTypes.arrayOf(PropTypes.string),
  onDownload: PropTypes.func,
  onCopy: PropTypes.func,
  onPrint: PropTypes.func
};

export default BackupCodesDisplay;
