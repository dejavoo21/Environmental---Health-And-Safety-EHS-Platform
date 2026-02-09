import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import api from '../../api/client';
import OTPInput from './OTPInput';

const TwoFactorPrompt = ({ tempToken, onSuccess, onCancel }) => {
  const [mode, setMode] = useState('totp'); // 'totp' or 'backup'
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = useCallback(async () => {
    const isBackup = mode === 'backup';
    const verifyCode = isBackup ? backupCode.trim() : code;

    if (!verifyCode || (isBackup ? verifyCode.length < 8 : verifyCode.length !== 6)) {
      setError(isBackup ? 'Please enter your 8-character backup code' : 'Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/2fa/login-verify', {
        tempToken,
        code: verifyCode,
        isBackupCode: isBackup
      });

      onSuccess(response.data);
    } catch (err) {
      const message = err.response?.data?.message || 'Verification failed';
      const errorCode = err.response?.data?.code;

      if (errorCode === 'MAX_ATTEMPTS') {
        setError('Too many failed attempts. Please log in again.');
        setTimeout(() => onCancel?.(), 2000);
      } else {
        setError(message);
        if (isBackup) {
          setBackupCode('');
        } else {
          setCode('');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [mode, code, backupCode, tempToken, onSuccess, onCancel]);

  const toggleMode = () => {
    setMode(mode === 'totp' ? 'backup' : 'totp');
    setCode('');
    setBackupCode('');
    setError('');
  };

  return (
    <div className="two-factor-prompt" data-testid="two-factor-prompt">
      <div className="two-factor-prompt-content">
        <h2>{mode === 'totp' ? 'Two-Factor Authentication' : 'Use Backup Code'}</h2>

        {mode === 'totp' ? (
          <>
            <p className="prompt-instructions">
              Enter the 6-digit code from your authenticator app.
            </p>

            <div className="otp-container">
              <OTPInput
                length={6}
                value={code}
                onChange={setCode}
                autoFocus
                disabled={loading}
              />
            </div>
          </>
        ) : (
          <>
            <p className="prompt-instructions">
              Enter one of your 8-character backup codes.
            </p>

            <div className="backup-code-input-container">
              <input
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                maxLength={8}
                disabled={loading}
                className="backup-code-input"
                autoFocus
                data-testid="backup-code-input"
              />
            </div>
          </>
        )}

        {error && (
          <div className="error-text" role="alert">{error}</div>
        )}

        <button
          type="button"
          className="btn primary full-width"
          onClick={handleVerify}
          disabled={loading}
          data-testid="verify-2fa-btn"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>

        <div className="two-factor-prompt-footer">
          <button
            type="button"
            className="btn link"
            onClick={toggleMode}
            disabled={loading}
          >
            {mode === 'totp' ? 'Lost your phone? Use a backup code instead' : '← Use authenticator code instead'}
          </button>
        </div>
      </div>
    </div>
  );
};

TwoFactorPrompt.propTypes = {
  tempToken: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func
};

export default TwoFactorPrompt;
