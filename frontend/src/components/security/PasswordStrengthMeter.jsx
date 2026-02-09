import { useMemo } from 'react';
import PropTypes from 'prop-types';

const requirements = [
  { id: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { id: 'uppercase', label: 'Contains uppercase', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lowercase', label: 'Contains lowercase', test: (pw) => /[a-z]/.test(pw) },
  { id: 'number', label: 'Contains number', test: (pw) => /[0-9]/.test(pw) },
  { id: 'special', label: 'Contains special character', test: (pw) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) }
];

const PasswordStrengthMeter = ({ password = '', showRequirements = true }) => {
  const results = useMemo(() => {
    return requirements.map((req) => ({
      ...req,
      passed: req.test(password)
    }));
  }, [password]);

  const passedCount = results.filter((r) => r.passed).length;
  const strengthPercent = (passedCount / requirements.length) * 100;

  const getStrengthLabel = () => {
    if (passedCount === 0) return '';
    if (passedCount <= 2) return 'Weak';
    if (passedCount <= 3) return 'Fair';
    if (passedCount <= 4) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = () => {
    if (passedCount <= 2) return 'var(--color-error, #dc2626)';
    if (passedCount <= 3) return 'var(--color-warning, #f59e0b)';
    if (passedCount <= 4) return 'var(--color-info, #3b82f6)';
    return 'var(--color-success, #22c55e)';
  };

  if (!password) {
    return null;
  }

  return (
    <div className="password-strength-meter" data-testid="password-strength-meter">
      <div className="strength-bar-container">
        <div
          className="strength-bar-fill"
          style={{
            width: `${strengthPercent}%`,
            backgroundColor: getStrengthColor()
          }}
        />
      </div>
      <div className="strength-label" style={{ color: getStrengthColor() }}>
        {getStrengthLabel()}
      </div>

      {showRequirements && (
        <ul className="password-requirements" aria-label="Password requirements">
          {results.map((req) => (
            <li
              key={req.id}
              className={`requirement ${req.passed ? 'passed' : 'pending'}`}
              data-testid={`req-${req.id}`}
            >
              <span className="requirement-icon" aria-hidden="true">
                {req.passed ? '✓' : '○'}
              </span>
              <span>{req.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

PasswordStrengthMeter.propTypes = {
  password: PropTypes.string,
  showRequirements: PropTypes.bool
};

export const validatePasswordStrength = (password) => {
  const results = requirements.map((req) => req.test(password));
  return results.every(Boolean);
};

export default PasswordStrengthMeter;
