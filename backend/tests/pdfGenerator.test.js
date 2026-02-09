const { formatDate, buildDateRangeString, formatDateTime } = require('../src/utils/pdfGenerator');

describe('PDF Generator Utilities', () => {
  describe('formatDate', () => {
    it('should return null for null input', () => {
      expect(formatDate(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(formatDate(undefined)).toBeNull();
    });

    it('should format a Date object to YYYY-MM-DD', () => {
      const date = new Date('2026-01-24T10:30:00Z');
      expect(formatDate(date)).toBe('2026-01-24');
    });

    it('should format a date string to YYYY-MM-DD', () => {
      expect(formatDate('2026-01-25')).toBe('2026-01-25');
    });
  });

  describe('buildDateRangeString', () => {
    it('should show full range when both dates provided', () => {
      const result = buildDateRangeString('2026-01-24', '2026-01-25');
      expect(result).toBe('Date range: 2026-01-24 to 2026-01-25');
    });

    it('should show "onwards" when only start date provided', () => {
      const result = buildDateRangeString('2026-01-24', null);
      expect(result).toBe('Date range: 2026-01-24 onwards');
    });

    it('should show "up to" when only end date provided', () => {
      const result = buildDateRangeString(null, '2026-01-25');
      expect(result).toBe('Date range: up to 2026-01-25');
    });

    it('should show "All" when no dates provided', () => {
      const result = buildDateRangeString(null, null);
      expect(result).toBe('Date range: All');
    });

    it('should show "All" when both dates are undefined', () => {
      const result = buildDateRangeString(undefined, undefined);
      expect(result).toBe('Date range: All');
    });

    it('should handle Date objects', () => {
      const start = new Date('2026-01-24T00:00:00Z');
      const end = new Date('2026-01-25T00:00:00Z');
      const result = buildDateRangeString(start, end);
      expect(result).toBe('Date range: 2026-01-24 to 2026-01-25');
    });
  });

  describe('formatDateTime', () => {
    it('should format date with timezone', () => {
      const date = new Date('2026-01-24T10:30:00Z');
      const result = formatDateTime(date, 'UTC');
      expect(result).toMatch(/2026-01-24 10:30 \(UTC\)/);
    });

    it('should use current date if no date provided', () => {
      const result = formatDateTime(null, 'Europe/London');
      expect(result).toContain('(Europe/London)');
    });

    it('should default to UTC timezone', () => {
      const date = new Date('2026-01-24T10:30:00Z');
      const result = formatDateTime(date);
      expect(result).toContain('(UTC)');
    });
  });
});
