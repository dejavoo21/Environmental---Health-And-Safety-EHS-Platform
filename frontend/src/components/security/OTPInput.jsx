import { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const OTPInput = ({ length = 6, value = '', onChange, autoFocus = true, disabled = false }) => {
  const inputRefs = useRef([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = useCallback((index, digit) => {
    // Only allow digits
    if (!/^\d?$/.test(digit)) {
      return;
    }

    const newValue = value.split('');
    newValue[index] = digit;
    const joined = newValue.join('').slice(0, length);
    onChange(joined);

    // Auto-advance to next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [value, length, onChange]);

  const handleKeyDown = useCallback((index, event) => {
    if (event.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // Move to previous input on backspace if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [value, length]);

  const handlePaste = useCallback((event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);

    // Focus the next empty input or the last one
    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  }, [length, onChange]);

  return (
    <div className="otp-input-container" data-testid="otp-input">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="otp-input-digit"
          aria-label={`Digit ${index + 1} of ${length}`}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
};

OTPInput.propTypes = {
  length: PropTypes.number,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  autoFocus: PropTypes.bool,
  disabled: PropTypes.bool
};

export default OTPInput;
