import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { PasswordStrengthMeter, validatePasswordStrength } from '../components/security';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  const validateToken = useCallback(async () => {
    if (!token) {
      setTokenError('No reset token provided');
      setValidating(false);
      return;
    }

    try {
      const response = await api.get('/auth/reset-password/validate', {
        params: { token }
      });
      setTokenValid(response.data.valid);
      setMaskedEmail(response.data.email || '');
    } catch (err) {
      const errorCode = err.response?.data?.error;
      if (errorCode === 'TOKEN_EXPIRED') {
        setTokenError('This reset link has expired. Please request a new one.');
      } else if (errorCode === 'TOKEN_USED') {
        setTokenError('This reset link has already been used.');
      } else {
        setTokenError('This reset link is invalid or has expired.');
      }
    } finally {
      setValidating(false);
    }
  }, [token]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (!validatePasswordStrength(newPassword)) {
      setError('Password does not meet all requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword
      });
      setSuccess(true);
    } catch (err) {
      const errorCode = err.response?.data?.code;
      if (errorCode === 'PASSWORD_REUSED') {
        setError('You cannot reuse a recent password. Please choose a different password.');
      } else if (errorCode === 'PASSWORD_WEAK') {
        setError('Password does not meet security requirements.');
      } else {
        setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Validating state
  if (validating) {
    return (
      <div className="auth-page" data-testid="reset-password-page">
        <div className="auth-card">
          <div className="loading-state">Validating reset link...</div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="auth-page" data-testid="reset-password-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="error-icon" aria-hidden="true">⚠️</div>
            <h1>Invalid Reset Link</h1>
          </div>

          <p className="auth-message error">{tokenError}</p>

          <Link to="/forgot-password" className="btn primary full-width">
            Request New Reset Link
          </Link>

          <div className="auth-footer">
            <Link to="/login" className="btn link">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="auth-page" data-testid="reset-password-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="success-icon" aria-hidden="true">✓</div>
            <h1>Password Reset Complete</h1>
          </div>

          <p className="auth-message">
            Your password has been successfully reset. You can now log in with your new password.
          </p>

          <button
            type="button"
            className="btn primary full-width"
            onClick={() => navigate('/login')}
            data-testid="login-btn"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="auth-page" data-testid="reset-password-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-header">
          <h1>Reset Password</h1>
          {maskedEmail && (
            <p>Enter a new password for <strong>{maskedEmail}</strong></p>
          )}
        </div>

        <label className="field">
          <span>New Password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            autoComplete="new-password"
            autoFocus
            data-testid="new-password-input"
          />
        </label>

        <PasswordStrengthMeter password={newPassword} showRequirements />

        <label className="field">
          <span>Confirm Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            data-testid="confirm-password-input"
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
          {loading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPasswordPage;
