import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      // Always show success message (no user enumeration)
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-page" data-testid="forgot-password-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="success-icon" aria-hidden="true">✉️</div>
            <h1>Check your email</h1>
          </div>

          <p className="auth-message">
            If an account exists for <strong>{email}</strong>, you will receive password reset instructions shortly.
          </p>

          <p className="auth-hint">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              type="button"
              className="btn link inline"
              onClick={() => setSubmitted(false)}
            >
              try again
            </button>
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
    <div className="auth-page" data-testid="forgot-password-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-header">
          <h1>Forgot Password?</h1>
          <p>Enter your email address and we'll send you instructions to reset your password.</p>
        </div>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            autoFocus
            data-testid="email-input"
          />
        </label>

        {error && (
          <div className="error-text" role="alert">{error}</div>
        )}

        <button
          type="submit"
          className="btn primary full-width"
          disabled={loading}
          data-testid="submit-btn"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <div className="auth-footer">
          <Link to="/login" className="btn link">
            ← Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;
