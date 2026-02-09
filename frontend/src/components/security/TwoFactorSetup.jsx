import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import api from '../../api/client';
import OTPInput from './OTPInput';
import BackupCodesDisplay from './BackupCodesDisplay';

const STEPS = {
  QR_CODE: 1,
  VERIFY: 2,
  BACKUP_CODES: 3
};

const TwoFactorSetup = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(STEPS.QR_CODE);
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [codesSaved, setCodesSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualCopied, setManualCopied] = useState(false);

  // Initialize 2FA setup and get QR code
  const initSetup = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/2fa/setup');
      setSetupData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initialize 2FA setup');
    } finally {
      setLoading(false);
    }
  }, []);

  // Start setup on mount
  useState(() => {
    initSetup();
  });

  const handleCopyManualKey = async () => {
    if (setupData?.manualEntryKey) {
      await navigator.clipboard.writeText(setupData.manualEntryKey.replace(/\s/g, ''));
      setManualCopied(true);
      setTimeout(() => setManualCopied(false), 2000);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/2fa/verify', { code: verifyCode });
      setBackupCodes(response.data.backupCodes);
      setStep(STEPS.BACKUP_CODES);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code');
      setVerifyCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (!codesSaved) {
      return;
    }
    onComplete?.();
  };

  const renderQRCodeStep = () => (
    <>
      <div className="setup-step-header">
        <h3>Step 1 of 3: Scan QR Code</h3>
      </div>

      <div className="setup-instructions">
        <p><strong>1. Install an authenticator app on your phone:</strong></p>
        <ul>
          <li>Google Authenticator</li>
          <li>Microsoft Authenticator</li>
          <li>Authy</li>
        </ul>

        <p><strong>2. Open the app and scan this QR code:</strong></p>
      </div>

      {setupData?.qrCodeUrl && (
        <div className="qr-code-container" data-testid="qr-code">
          <img src={setupData.qrCodeUrl} alt="2FA QR Code" />
        </div>
      )}

      <div className="manual-entry-section">
        <p>Can't scan? Enter this code manually:</p>
        <div className="manual-key-box">
          <code data-testid="manual-key">{setupData?.manualEntryKey}</code>
          <button
            type="button"
            className="btn small"
            onClick={handleCopyManualKey}
          >
            {manualCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="setup-actions">
        <button
          type="button"
          className="btn secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => setStep(STEPS.VERIFY)}
          disabled={!setupData}
        >
          Continue →
        </button>
      </div>
    </>
  );

  const renderVerifyStep = () => (
    <>
      <div className="setup-step-header">
        <h3>Step 2 of 3: Verify Setup</h3>
      </div>

      <div className="setup-instructions">
        <p>
          Enter the 6-digit code from your authenticator app to verify the setup is working correctly.
        </p>
      </div>

      <div className="verify-input-container">
        <OTPInput
          length={6}
          value={verifyCode}
          onChange={setVerifyCode}
          autoFocus
          disabled={loading}
        />
      </div>

      {error && (
        <div className="error-text" role="alert">{error}</div>
      )}

      <div className="setup-actions">
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setStep(STEPS.QR_CODE);
            setVerifyCode('');
            setError('');
          }}
          disabled={loading}
        >
          ← Back
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={handleVerify}
          disabled={loading || verifyCode.length !== 6}
        >
          {loading ? 'Verifying...' : 'Verify & Continue →'}
        </button>
      </div>
    </>
  );

  const renderBackupCodesStep = () => (
    <>
      <div className="setup-step-header">
        <h3>Step 3 of 3: Save Backup Codes</h3>
      </div>

      <div className="warning-banner">
        <span className="warning-icon" aria-hidden="true">⚠️</span>
        <span>
          <strong>IMPORTANT:</strong> Save these backup codes in a safe place.
        </span>
      </div>

      <p className="setup-instructions">
        If you lose access to your authenticator app, you can use these codes to sign in. 
        Each code can only be used once.
      </p>

      <BackupCodesDisplay codes={backupCodes} />

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={codesSaved}
          onChange={(e) => setCodesSaved(e.target.checked)}
          data-testid="codes-saved-checkbox"
        />
        <span>I have saved my backup codes in a secure location</span>
      </label>

      <div className="setup-actions">
        <button
          type="button"
          className="btn primary"
          onClick={handleComplete}
          disabled={!codesSaved}
          data-testid="complete-setup-btn"
        >
          Complete Setup
        </button>
      </div>
    </>
  );

  return (
    <div className="two-factor-setup" data-testid="two-factor-setup">
      <h2>Enable Two-Factor Authentication</h2>

      {loading && step === STEPS.QR_CODE && !setupData && (
        <div className="loading-state">Loading...</div>
      )}

      {error && step === STEPS.QR_CODE && (
        <div className="error-text" role="alert">{error}</div>
      )}

      {step === STEPS.QR_CODE && setupData && renderQRCodeStep()}
      {step === STEPS.VERIFY && renderVerifyStep()}
      {step === STEPS.BACKUP_CODES && renderBackupCodesStep()}
    </div>
  );
};

TwoFactorSetup.propTypes = {
  onComplete: PropTypes.func,
  onCancel: PropTypes.func
};

export default TwoFactorSetup;
