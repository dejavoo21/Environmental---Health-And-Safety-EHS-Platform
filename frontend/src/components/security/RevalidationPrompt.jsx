import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import api from '../../api/client';
import OTPInput from './OTPInput';

const RevalidationPrompt = ({ revalidationToken, channels, onSuccess, onCancel }) => {
  const availableChannels = useMemo(() => {
    const opts = [];
    if (channels?.email) opts.push({ value: 'email', label: 'Email' });
    if (channels?.phone) opts.push({ value: 'phone', label: 'Mobile phone' });
    return opts;
  }, [channels]);

  const [channel, setChannel] = useState(availableChannels[0]?.value || 'email');
  const [codeSent, setCodeSent] = useState(false);
  const [destinationHint, setDestinationHint] = useState('');
  const [code, setCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/revalidation/start', {
        revalidationToken,
        channel
      });
      setCodeSent(true);
      setDestinationHint(res.data.destinationMasked || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/revalidation/verify', {
        revalidationToken,
        code,
        rememberDevice
      });
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="two-factor-prompt" data-testid="revalidation-prompt">
      <div className="two-factor-prompt-content">
        <h2>Account Revalidation</h2>
        <p className="prompt-instructions">
          For security, we need to re-validate your access. Choose where to receive your OTP.
        </p>

        <div className="backup-code-input-container">
          <select
            className="backup-code-input"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            disabled={loading || codeSent}
          >
            {availableChannels.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        {!codeSent ? (
          <button
            type="button"
            className="btn primary full-width"
            onClick={handleSendCode}
            disabled={loading || availableChannels.length === 0}
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        ) : (
          <>
            <p className="prompt-instructions">
              Enter the 6-digit code sent to <strong>{destinationHint || channel}</strong>.
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
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                disabled={loading}
              />
              <span>Remember this device for 30 days</span>
            </label>
            <button
              type="button"
              className="btn primary full-width"
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify and Continue'}
            </button>
          </>
        )}

        {error && <div className="error-text" role="alert">{error}</div>}

        <div className="two-factor-prompt-footer">
          <button type="button" className="btn link" onClick={onCancel} disabled={loading}>
            Cancel and return to login
          </button>
        </div>
      </div>
    </div>
  );
};

RevalidationPrompt.propTypes = {
  revalidationToken: PropTypes.string.isRequired,
  channels: PropTypes.shape({
    email: PropTypes.bool,
    phone: PropTypes.bool
  }),
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func
};

export default RevalidationPrompt;
