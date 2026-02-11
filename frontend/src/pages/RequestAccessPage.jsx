import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const ROLE_OPTIONS = [
  { value: '', label: 'Select a role' },
  { value: 'worker', label: 'Worker' },
  { value: 'manager', label: 'Manager' }
];

const RequestAccessPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    organisationCode: '',
    requestedRole: '',
    reason: '',
    termsAccepted: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [apiError, setApiError] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    } else if (formData.fullName.trim().length > 255) {
      newErrors.fullName = 'Name must be less than 255 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Organisation code is optional - can be added by admin later

    if (!formData.requestedRole) {
      newErrors.requestedRole = 'Please select a role';
    }

    if (formData.reason && formData.reason.length > 500) {
      newErrors.reason = 'Reason must be less than 500 characters';
    }

    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the terms to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/access-requests', {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        organisationCode: formData.organisationCode.trim() ? formData.organisationCode.trim().toUpperCase() : null,
        requestedRole: formData.requestedRole,
        reason: formData.reason.trim() || undefined,
        termsAccepted: formData.termsAccepted
      });

      setReferenceNumber(response.data.referenceNumber);
      setSubmitted(true);
    } catch (err) {
      const errorCode = err.response?.data?.code;
      const errorMessage = err.response?.data?.message;

      if (errorCode === 'DUPLICATE_REQUEST') {
        setApiError('You already have a pending access request for this organisation.');
      } else if (errorCode === 'EMAIL_REGISTERED') {
        setApiError('This email is already registered. Please log in instead.');
      } else if (errorCode === 'RATE_LIMIT') {
        setApiError('Too many requests. Please try again later.');
      } else {
        setApiError(errorMessage || 'Failed to submit request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="auth-page" data-testid="request-access-page">
        <div className="auth-card success-card">
          <div className="auth-header">
            <div className="success-icon large" aria-hidden="true">✓</div>
            <h1>Request Submitted</h1>
          </div>

          <p className="auth-message">
            Thank you for your interest in joining the EHS Portal.
          </p>

          <div className="reference-box">
            <span className="reference-label">Reference Number:</span>
            <code className="reference-number" data-testid="reference-number">
              {referenceNumber}
            </code>
          </div>

          <p className="auth-hint">
            You will receive an email confirmation at <strong>{formData.email}</strong>. 
            An administrator will review your request and you'll be notified of the outcome.
          </p>

          <div className="auth-footer">
            <Link to="/login" className="btn link">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" data-testid="request-access-page">
      <form className="auth-card wide" onSubmit={handleSubmit}>
        <div className="auth-header">
          <h1>Request Access</h1>
          <p>Fill in your details to request access to an organisation's EHS Portal.</p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Full Name <span className="required">*</span></span>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="John Smith"
              autoComplete="name"
              autoFocus
              className={errors.fullName ? 'error' : ''}
              data-testid="fullname-input"
            />
            {errors.fullName && (
              <span className="field-error">{errors.fullName}</span>
            )}
          </label>

          <label className="field">
            <span>Email Address <span className="required">*</span></span>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              className={errors.email ? 'error' : ''}
              data-testid="email-input"
            />
            {errors.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </label>

          <label className="field">
            <span>Organisation Code (Optional)</span>
            <input
              type="text"
              value={formData.organisationCode}
              onChange={(e) => handleChange('organisationCode', e.target.value.toUpperCase())}
              placeholder="e.g., ACME"
              className={errors.organisationCode ? 'error' : ''}
              data-testid="org-code-input"
            />
            {errors.organisationCode && (
              <span className="field-error">{errors.organisationCode}</span>
            )}
            <span className="field-hint">
              If you know your organisation code, enter it here. Otherwise, leave blank and an admin will assign you later.
            </span>
          </label>

          <label className="field">
            <span>Requested Role <span className="required">*</span></span>
            <select
              value={formData.requestedRole}
              onChange={(e) => handleChange('requestedRole', e.target.value)}
              className={errors.requestedRole ? 'error' : ''}
              data-testid="role-select"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.requestedRole && (
              <span className="field-error">{errors.requestedRole}</span>
            )}
          </label>

          <label className="field full-width">
            <span>Reason for Access</span>
            <textarea
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Please describe why you need access (optional)"
              rows={3}
              maxLength={500}
              className={errors.reason ? 'error' : ''}
              data-testid="reason-input"
            />
            {errors.reason && (
              <span className="field-error">{errors.reason}</span>
            )}
            <span className="field-hint">
              {formData.reason.length}/500 characters
            </span>
          </label>
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={formData.termsAccepted}
            onChange={(e) => handleChange('termsAccepted', e.target.checked)}
            data-testid="terms-checkbox"
          />
          <span>
            I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          </span>
        </label>
        {errors.termsAccepted && (
          <div className="field-error">{errors.termsAccepted}</div>
        )}

        {apiError && (
          <div className="error-text" role="alert">{apiError}</div>
        )}

        <button
          type="submit"
          className="btn primary full-width"
          disabled={loading}
          data-testid="submit-btn"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>

        <div className="auth-footer">
          <span>Already have an account? </span>
          <Link to="/login">Log in</Link>
        </div>
      </form>
    </div>
  );
};

export default RequestAccessPage;
