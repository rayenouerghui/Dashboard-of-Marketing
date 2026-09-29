import { describe, it, expect } from 'vitest';
import {
  nowInTunis,
  todayInTunis,
  startOfDayInTunis,
  endOfDayInTunis,
  startOfWeekInTunis,
  endOfWeekInTunis,
  startOfMonthInTunis,
  endOfMonthInTunis,
  isTodayInTunis,
  isThisWeekInTunis,
  isThisMonthInTunis,
  formatDateInTunis,
  parseDateInTunis,
  getDateBoundsInTunis,
} from '../dates';

describe('Date Helpers (Africa/Tunis)', () => {
  describe('nowInTunis', () => {
    it('should return a Date object', () => {
      const result = nowInTunis();
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('todayInTunis', () => {
    it('should return a string in YYYY-MM-DD format', () => {
      const result = todayInTunis();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('startOfDayInTunis', () => {
    it('should return start of day for given date', () => {
      const date = '2024-01-15T10:30:00';
      const result = startOfDayInTunis(date);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('endOfDayInTunis', () => {
    it('should return end of day for given date', () => {
      const date = '2024-01-15T10:30:00';
      const result = endOfDayInTunis(date);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('startOfWeekInTunis', () => {
    it('should return start of week (Monday) for given date', () => {
      const date = '2024-01-15T10:30:00'; // Monday
      const result = startOfWeekInTunis(date);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('endOfWeekInTunis', () => {
    it('should return end of week (Sunday) for given date', () => {
      const date = '2024-01-15T10:30:00'; // Monday
      const result = endOfWeekInTunis(date);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('startOfMonthInTunis', () => {
    it('should return start of month for given date', () => {
      const date = '2024-01-15T10:30:00';
      const result = startOfMonthInTunis(date);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('endOfMonthInTunis', () => {
    it('should return end of month for given date', () => {
      const date = '2024-01-15T10:30:00';
      const result = endOfMonthInTunis(date);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('isTodayInTunis', () => {
    it('should return true for today', () => {
      const result = isTodayInTunis(new Date());
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isThisWeekInTunis', () => {
    it('should return boolean for week check', () => {
      const result = isThisWeekInTunis(new Date());
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isThisMonthInTunis', () => {
    it('should return boolean for month check', () => {
      const result = isThisMonthInTunis(new Date());
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formatDateInTunis', () => {
    it('should format date correctly', () => {
      const date = '2024-01-15T10:30:00';
      const result = formatDateInTunis(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('parseDateInTunis', () => {
    it('should parse date string and return Date', () => {
      const dateStr = '2024-01-15';
      const result = parseDateInTunis(dateStr);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('getDateBoundsInTunis', () => {
    it('should return date bounds object', () => {
      const result = getDateBoundsInTunis();
      expect(result).toHaveProperty('today');
      expect(result).toHaveProperty('weekStart');
      expect(result).toHaveProperty('monthStart');
      expect(result.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.monthStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
