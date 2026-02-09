import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { PasswordStrengthMeter, validatePasswordStrength, TwoFactorSetup, BackupCodesDisplay } from '../components/security';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const SecurityPage = () => {
  // Security status
  const [securityInfo, setSecurityInfo] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // 2FA
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');

  // Regenerate backup codes
  const [showRegenCodes, setShowRegenCodes] = useState(false);
  const [regenCode, setRegenCode] = useState('');
  const [newBackupCodes, setNewBackupCodes] = useState([]);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState('');

  // Fetch security info
  const fetchSecurityInfo = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [securityRes, historyRes] = await Promise.all([
        api.get('/users/me/security'),
        api.get('/users/me/login-history', { params: { limit: 5 } })
      ]);
      setSecurityInfo(securityRes.data);
      setLoginHistory(historyRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load security information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurityInfo();
  }, [fetchSecurityInfo]);

  // Change password
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!passwordData.currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (!validatePasswordStrength(passwordData.newPassword)) {
      setPasswordError('New password does not meet requirements');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/users/me/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordSuccess(true);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      fetchSecurityInfo();
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'INCORRECT_PASSWORD') {
        setPasswordError('Current password is incorrect');
      } else if (code === 'PASSWORD_REUSED') {
        setPasswordError('You cannot reuse a recent password');
      } else if (code === 'SAME_PASSWORD') {
        setPasswordError('New password must be different from current password');
      } else {
        setPasswordError(err.response?.data?.message || 'Failed to change password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!disableCode || disableCode.length !== 6) {
      setDisableError('Please enter a valid 6-digit code');
      return;
    }

    setDisableLoading(true);
    setDisableError('');
    try {
      await api.delete('/auth/2fa', { data: { code: disableCode } });
      setShow2FADisable(false);
      setDisableCode('');
      fetchSecurityInfo();
    } catch (err) {
      setDisableError(err.response?.data?.message || 'Invalid code');
    } finally {
      setDisableLoading(false);
    }
  };

  // Regenerate backup codes
  const handleRegenCodes = async () => {
    if (!regenCode || regenCode.length !== 6) {
      setRegenError('Please enter a valid 6-digit code');
      return;
    }

    setRegenLoading(true);
    setRegenError('');
    try {
      const response = await api.post('/auth/2fa/backup-codes/regenerate', { code: regenCode });
      setNewBackupCodes(response.data.backupCodes);
      setRegenCode('');
      fetchSecurityInfo();
    } catch (err) {
      setRegenError(err.response?.data?.message || 'Invalid code');
    } finally {
      setRegenLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" data-testid="security-page">
        <div className="loading-state">Loading security settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container" data-testid="security-page">
        <div className="error-banner">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-container" data-testid="security-page">
      <div className="page-header">
        <h1>Security</h1>
        <p>Manage your account security settings.</p>
      </div>

      {passwordSuccess && (
        <div className="success-banner" role="status">
          Password changed successfully.
        </div>
      )}

      {/* 2FA Section */}
      <section className="security-section">
        <h2>Two-Factor Authentication</h2>
        
        {securityInfo?.twoFactorEnabled ? (
          <div className="security-status enabled">
            <div className="status-badge success">Enabled</div>
            <p>
              Two-factor authentication is active on your account.
              <br />
              <span className="muted">
                Enabled on {formatDate(securityInfo.twoFactorEnabledAt)}
              </span>
            </p>

            <div className="backup-codes-status">
              <strong>Backup codes remaining:</strong>{' '}
              <span className={securityInfo.backupCodesRemaining <= 2 ? 'warning' : ''}>
                {securityInfo.backupCodesRemaining} of 10
              </span>
            </div>

            <div className="action-row">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowRegenCodes(true)}
              >
                Regenerate Backup Codes
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => setShow2FADisable(true)}
                data-testid="disable-2fa-btn"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        ) : (
          <div className="security-status disabled">
            <div className="status-badge warning">Not Enabled</div>
            <p>
              Add an extra layer of security to your account by requiring a code from your 
              authenticator app when signing in.
            </p>
            <button
              type="button"
              className="btn primary"
              onClick={() => setShowSetup2FA(true)}
              data-testid="enable-2fa-btn"
            >
              Enable Two-Factor Authentication
            </button>
          </div>
        )}
      </section>

      {/* Password Section */}
      <section className="security-section">
        <h2>Password</h2>
        
        <p>
          <strong>Last changed:</strong>{' '}
          {securityInfo?.passwordLastChanged 
            ? formatDate(securityInfo.passwordLastChanged)
            : 'Never'}
        </p>

        {!showPasswordForm ? (
          <button
            type="button"
            className="btn secondary"
            onClick={() => setShowPasswordForm(true)}
            data-testid="change-password-btn"
          >
            Change Password
          </button>
        ) : (
          <form className="password-change-form" onSubmit={handlePasswordChange}>
            <label className="field">
              <span>Current Password</span>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))}
                autoComplete="current-password"
                data-testid="current-password-input"
              />
            </label>

            <label className="field">
              <span>New Password</span>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
                autoComplete="new-password"
                data-testid="new-password-input"
              />
            </label>
            <PasswordStrengthMeter password={passwordData.newPassword} showRequirements />

            <label className="field">
              <span>Confirm New Password</span>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
                autoComplete="new-password"
                data-testid="confirm-password-input"
              />
            </label>

            {passwordError && (
              <div className="error-text" role="alert">{passwordError}</div>
            )}

            <div className="action-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError('');
                }}
                disabled={passwordLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={passwordLoading}
                data-testid="save-password-btn"
              >
                {passwordLoading ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Login History Section */}
      <section className="security-section">
        <h2>Login History</h2>
        
        {loginHistory.length === 0 ? (
          <p className="muted">No login history available.</p>
        ) : (
          <>
            <table className="data-table compact" data-testid="login-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>IP Address</th>
                  <th>Browser</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((entry, idx) => (
                  <tr key={idx}>
                    <td>{formatDate(entry.at)}</td>
                    <td><code>{entry.ipAddress}</code></td>
                    <td>{entry.browser || '-'}</td>
                    <td>{entry.location || '-'}</td>
                    <td>
                      {entry.success ? (
                        <span className="badge success">Success</span>
                      ) : (
                        <span className="badge error" title={entry.failureReason}>Failed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <a href="/users/me/login-history" className="btn link small">
              View All Login History
            </a>
          </>
        )}
      </section>

      {/* 2FA Setup Modal */}
      {showSetup2FA && (
        <div className="modal-overlay" onClick={() => setShowSetup2FA(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <TwoFactorSetup
              onComplete={() => {
                setShowSetup2FA(false);
                fetchSecurityInfo();
              }}
              onCancel={() => setShowSetup2FA(false)}
            />
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {show2FADisable && (
        <div className="modal-overlay" onClick={() => setShow2FADisable(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} data-testid="disable-2fa-modal">
            <div className="modal-header">
              <h2>Disable Two-Factor Authentication</h2>
              <button type="button" className="close-btn" onClick={() => setShow2FADisable(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="warning-text">
                ⚠️ Disabling 2FA will make your account less secure.
              </p>
              <p>Enter your current authenticator code to confirm:</p>
              <input
                type="text"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="otp-single-input"
                data-testid="disable-2fa-code"
              />
              {disableError && (
                <div className="error-text" role="alert">{disableError}</div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShow2FADisable(false);
                  setDisableCode('');
                  setDisableError('');
                }}
                disabled={disableLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleDisable2FA}
                disabled={disableLoading || disableCode.length !== 6}
                data-testid="confirm-disable-2fa-btn"
              >
                {disableLoading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Backup Codes Modal */}
      {showRegenCodes && (
        <div className="modal-overlay" onClick={() => !newBackupCodes.length && setShowRegenCodes(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} data-testid="regen-codes-modal">
            <div className="modal-header">
              <h2>{newBackupCodes.length ? 'New Backup Codes' : 'Regenerate Backup Codes'}</h2>
              {!newBackupCodes.length && (
                <button type="button" className="close-btn" onClick={() => setShowRegenCodes(false)}>×</button>
              )}
            </div>
            <div className="modal-body">
              {newBackupCodes.length ? (
                <>
                  <div className="warning-banner">
                    ⚠️ Save these codes now. Your previous codes are no longer valid.
                  </div>
                  <BackupCodesDisplay codes={newBackupCodes} />
                </>
              ) : (
                <>
                  <p>
                    This will generate new backup codes and invalidate all previous codes.
                  </p>
                  <p>Enter your current authenticator code to confirm:</p>
                  <input
                    type="text"
                    value={regenCode}
                    onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="otp-single-input"
                    data-testid="regen-codes-input"
                  />
                  {regenError && (
                    <div className="error-text" role="alert">{regenError}</div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              {newBackupCodes.length ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setShowRegenCodes(false);
                    setNewBackupCodes([]);
                  }}
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setShowRegenCodes(false);
                      setRegenCode('');
                      setRegenError('');
                    }}
                    disabled={regenLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={handleRegenCodes}
                    disabled={regenLoading || regenCode.length !== 6}
                    data-testid="confirm-regen-btn"
                  >
                    {regenLoading ? 'Generating...' : 'Generate New Codes'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityPage;
