/**
 * Accessibility utilities for WCAG 2.1 compliance
 */

/**
 * Announce a message to screen readers via the live region
 * @param {string} message - The message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcer = document.getElementById('aria-live-announcer');
  if (!announcer) {
    console.warn('aria-live-announcer element not found');
    return;
  }
  
  // Set the appropriate aria-live value
  announcer.setAttribute('aria-live', priority);
  
  // Clear and set the message (this triggers the announcement)
  announcer.textContent = '';
  // Use requestAnimationFrame to ensure DOM update
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
};

/**
 * Generate unique IDs for form field/error associations
 * @param {string} fieldName - The base field name
 * @returns {object} Object with id, errorId, and describedBy
 */
export const useFieldIds = (fieldName) => {
  const id = `field-${fieldName}`;
  const errorId = `${id}-error`;
  const describedBy = errorId;
  
  return {
    id,
    errorId,
    describedBy,
    inputProps: { id, 'aria-describedby': errorId },
    errorProps: { id: errorId, role: 'alert', 'aria-live': 'polite' }
  };
};

/**
 * Hook to trap focus within a container (for modals)
 * @param {React.RefObject} containerRef - Ref to the container element
 * @param {boolean} isActive - Whether the trap is active
 */
export const useFocusTrap = (containerRef, isActive) => {
  if (typeof window === 'undefined') return;
  
  const handleKeyDown = (e) => {
    if (!isActive || !containerRef.current) return;
    
    if (e.key === 'Tab') {
      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };
  
  if (isActive) {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }
};

/**
 * Generate aria-label for interactive data visualizations
 * @param {string} chartType - Type of chart (bar, line, pie, etc.)
 * @param {string} title - Chart title
 * @param {Array} dataPoints - Summary of data points
 * @returns {string} Descriptive aria-label
 */
export const getChartAriaLabel = (chartType, title, dataPoints = []) => {
  const summary = dataPoints.length > 0 
    ? `. Contains ${dataPoints.length} data points.`
    : '';
  return `${chartType} chart: ${title}${summary}`;
};

export default {
  announceToScreenReader,
  useFieldIds,
  useFocusTrap,
  getChartAriaLabel
};
