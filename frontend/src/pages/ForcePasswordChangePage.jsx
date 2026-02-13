import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Lock,
  CheckCircle,
  AlertCircle,
  Key
} from 'lucide-react';
import './ForcePasswordChangePage.css';

const ForcePasswordChangePage = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Password strength requirements
  const passwordRequirements = [
    { id: 'length', label: 'At least 12 characters', check: (p) => p.length >= 12 },
    { id: 'uppercase', label: 'One uppercase letter', check: (p) => /[A-Z]/.test(p) },
    { id: 'lowercase', label: 'One lowercase letter', check: (p) => /[a-z]/.test(p) },
    { id: 'number', label: 'One number', check: (p) => /[0-9]/.test(p) },
    { id: 'special', label: 'One special character (!@#$%^&*)', check: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) }
  ];

  const validatePassword = (password) => {
    return passwordRequirements.every(req => req.check(password));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!formData.currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (!validatePassword(formData.newPassword)) {
      setError('Password does not meet all requirements');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      await api.post('/users/me/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      setSuccess(true);
      
      // Refresh user data after successful password change
      if (refreshUser) {
        await refreshUser();
      }
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'INCORRECT_PASSWORD') {
        setError('Current password is incorrect');
      } else if (code === 'PASSWORD_REUSED') {
        setError('You cannot reuse a recent password');
      } else if (code === 'SAME_PASSWORD') {
        setError('New password must be different from current password');
      } else {
        setError(err.response?.data?.message || 'Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (success) {
    return (
      <div className="force-password-change-page">
        <div className="force-password-change-container success-container">
          <div className="success-icon">
            <CheckCircle size={64} />
          </div>
          <h1>Password Changed Successfully!</h1>
          <p>Your password has been updated. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="force-password-change-page">
      <div className="force-password-change-container">
        <div className="force-password-change-header">
          <div className="header-icon">
            <Shield size={48} />
          </div>
          <h1>Password Change Required</h1>
          <p>
            For security reasons, you must change your temporary password before continuing.
          </p>
        </div>

        {error && (
          <div className="error-alert">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="password-form">
          <div className="form-group">
            <label htmlFor="currentPassword">
              <Key size={18} />
              Current Password (Temporary)
            </label>
            <div className="password-input-wrapper">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter the temporary password from your email"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
              >
                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">
              <Lock size={18} />
              New Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter your new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Requirements */}
            <div className="password-requirements">
              <span className="requirements-title">Password must contain:</span>
              <ul>
                {passwordRequirements.map(req => (
                  <li 
                    key={req.id} 
                    className={req.check(formData.newPassword) ? 'met' : 'unmet'}
                  >
                    {req.check(formData.newPassword) ? (
                      <CheckCircle size={14} />
                    ) : (
                      <AlertCircle size={14} />
                    )}
                    {req.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <Lock size={18} />
              Confirm New Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <span className="field-error">Passwords do not match</span>
            )}
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Changing Password...
              </>
            ) : (
              'Change Password & Continue'
            )}
          </button>
        </form>

        <div className="form-footer">
          <button 
            type="button" 
            className="logout-link"
            onClick={handleLogout}
          >
            Log out and try a different account
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForcePasswordChangePage;
