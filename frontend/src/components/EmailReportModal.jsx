import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

const EmailReportModal = ({ isOpen, onClose, onSend, reportType, sending }) => {
  const { user } = useAuth();
  const [toEmail, setToEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState(`EHS Report - ${reportType}`);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate email
    if (!toEmail.trim()) {
      setError('Email address is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    onSend({ toEmail: toEmail.trim(), subject: subject.trim() || undefined });
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal email-report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Email {reportType} Report</h2>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="modal-description">
              Send a PDF report to the specified email address.
            </p>

            <label className="field">
              <span>To Email *</span>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="recipient@example.com"
                disabled={sending}
              />
            </label>

            <label className="field">
              <span>Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject (optional)"
                disabled={sending}
              />
            </label>

            {error && <div className="form-error">{error}</div>}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={handleClose}
              disabled={sending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailReportModal;
