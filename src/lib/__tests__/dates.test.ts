import { describe, it, expect, vi } from 'vitest';
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
  parseSubmittedAt,
} from '../dates';
import { buildMemberRanking, RANKING_START_DATE } from '../ranking';

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

  describe('parseSubmittedAt', () => {
    it('parses ISO and slash dates using Tunis rules', () => {
      expect(parseSubmittedAt('2026-09-01T10:00:00Z')?.toISOString()).toContain('2026-09-01T10:00:00.000Z');
      expect(parseSubmittedAt('01/09/2026 14:22')?.toISOString()).toBeTruthy();
      expect(parseSubmittedAt('9/1/2026 14:22:10')?.toISOString()).toBeTruthy();
      expect(parseSubmittedAt('31/08/2026')?.toISOString()).toBeTruthy();
    });

    it('resolves ambiguous dates according to Tunisia day/month precedence rules', () => {
      const d1 = parseSubmittedAt('01/09/2026');
      const d2 = parseSubmittedAt('31/08/2026');
      const d3 = parseSubmittedAt('9/1/2026 14:22:10');

      expect(d1).not.toBeNull();
      expect(d2).not.toBeNull();
      expect(d3).not.toBeNull();
      expect(formatDateInTunis(d1!)).toBe('2026-09-01');
      expect(formatDateInTunis(d2!)).toBe('2026-08-31');
      expect(formatDateInTunis(d3!)).toBe('2026-01-09');
    });
  });

  describe('ranking cutoff', () => {
    it('only counts leads on or after 2026-09-01 in Africa/Tunis timezone', () => {
      const rows = [
        { 'Submitted at': '2026-08-31 23:59:00', 'Member Name': 'Alice' },
        { 'Submitted at': '2026-09-01 00:00:00', 'Member Name': 'Alice' },
        { 'Submitted at': '2026-09-01T00:00:00Z', 'Member Name': 'Alice' },
        { 'Submitted at': '31/08/2026', 'Member Name': 'Bob' },
        { 'Submitted at': '01/09/2026', 'Member Name': 'Bob' },
      ];

      const ranking = buildMemberRanking(rows, { cutoff: RANKING_START_DATE, todayOverride: '2026-09-01' });
      expect(ranking.members.map((m) => m.name)).toEqual(['Alice', 'Bob']);
      expect(ranking.totalLeads).toBe(3);
      expect(ranking.entries.get('Alice')?.total).toBe(2);
      expect(ranking.entries.get('Bob')?.total).toBe(1);
    });

    it('drops unparseable dates and warns', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const rows = [
        { 'Submitted at': 'not-a-date', 'Member Name': 'Alice' },
        { 'Submitted at': '2026-09-01', 'Member Name': 'Charlie' },
      ];

      const ranking = buildMemberRanking(rows, { cutoff: RANKING_START_DATE, todayOverride: '2026-09-01' });

      expect(ranking.members.map((m) => m.name)).toEqual(['Charlie']);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('1 rows skipped: unparseable date'));
      warn.mockRestore();
    });

    it('still excludes source labels from rankings', () => {
      const rows = [
        { 'Submitted at': '2026-09-01', 'Member Name': 'Information' },
        { 'Submitted at': '2026-09-02', 'Member Name': 'Classroom' },
        { 'Submitted at': '2026-09-03', 'Member Name': 'Alice' },
      ];

      const ranking = buildMemberRanking(rows, { cutoff: RANKING_START_DATE, todayOverride: '2026-09-03' });
      expect(ranking.members.map((m) => m.name)).toEqual(['Alice']);
      expect(ranking.totalLeads).toBe(3);
    });

    it('counts rows beyond 2000 and does not cap by the sheet page size', () => {
      const rows = Array.from({ length: 2001 }, (_, index) => ({
        'Submitted at': '2026-09-15T12:00:00Z',
        'Member Name': `Member ${index + 1}`,
      }));

      const ranking = buildMemberRanking(rows, { cutoff: RANKING_START_DATE, todayOverride: '2026-09-15' });
      expect(ranking.rowsRead).toBe(2001);
      expect(ranking.rowsSinceCutoff).toBe(2001);
      expect(ranking.totalLeads).toBe(2001);
      expect(ranking.members.length).toBe(2001);
    });
  });
});
