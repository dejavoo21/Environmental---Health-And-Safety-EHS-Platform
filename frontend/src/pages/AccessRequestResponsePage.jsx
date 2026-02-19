import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';

const AccessRequestResponsePage = () => {
  const [searchParams] = useSearchParams();
  const initialRef = useMemo(() => searchParams.get('ref') || '', [searchParams]);
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const initialToken = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [referenceNumber, setReferenceNumber] = useState(initialRef);
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [passphrase, setPassphrase] = useState('');
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!referenceNumber.trim() || !email.trim() || !token.trim() || !passphrase.trim() || !response.trim()) {
      setError('Reference number, email, response link token, OTP/passphrase, and your response are required.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.post('/access-requests/respond', {
        referenceNumber: referenceNumber.trim(),
        email: email.trim().toLowerCase(),
        token: token.trim(),
        passphrase: passphrase.trim(),
        response: response.trim()
      });

      if (result.data?.success) {
        setSuccess(true);
      } else {
        setError(result.data?.message || 'Unable to submit your response.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit your response.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card success-card">
          <div className="auth-header">
            <h1>Response Submitted</h1>
          </div>
          <p className="auth-message">
            Thank you. Your additional information has been submitted for review.
          </p>
          <p className="auth-hint">
            An administrator has been notified and your access request is now pending review.
          </p>
          <div className="auth-footer">
            <Link to="/login" className="btn link">Go to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" data-testid="access-request-respond-page">
      <form className="auth-card wide" onSubmit={handleSubmit}>
        <div className="auth-header">
          <h1>Respond to Access Request</h1>
          <p>Provide the additional information requested by the administrator.</p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Reference Number</span>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="AR-2026-0001"
              data-testid="ref-input"
            />
          </label>

          <label className="field">
            <span>Email Address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              data-testid="email-input"
            />
          </label>

          <label className="field">
            <span>Response Link Token</span>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Token from your email link"
              data-testid="token-input"
            />
          </label>

          <label className="field">
            <span>One-Time Passphrase (OTP)</span>
            <input
              type="text"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value.toUpperCase())}
              placeholder="ABCD-EFGH"
              data-testid="passphrase-input"
            />
          </label>

          <label className="field full-width">
            <span>Your Response</span>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Enter the requested information here..."
              rows={6}
              maxLength={2000}
              data-testid="response-input"
            />
            <span className="field-hint">{response.length}/2000 characters</span>
          </label>
        </div>

        {error && <div className="error-text" role="alert">{error}</div>}

        <button
          type="submit"
          className="btn primary full-width"
          disabled={submitting}
          data-testid="submit-btn"
        >
          {submitting ? 'Submitting...' : 'Submit Response'}
        </button>
      </form>
    </div>
  );
};

export default AccessRequestResponsePage;
