import { describe, expect, it } from 'vitest';
import { dateStringToDate } from '@/lib/dates';
import {
  filterVisibleScheduledAttractions,
  hasScheduledAttractionRow,
  isAttractionVisibleToMembers,
} from '../googleSheetsServer';

describe('Scheduled attractions visibility', () => {
  it('keeps future attractions visible and hides expired ones', () => {
    const future = {
      id: 'future-1',
      title: 'Future event',
      start: '2099-12-31',
      university: 'Test University',
      status: 'active',
    };

    const old = {
      id: 'old-1',
      title: 'Expired event',
      start: '2020-01-01',
      university: 'Old University',
      status: 'active',
    };

    expect(isAttractionVisibleToMembers(future, new Date('2098-01-01')).visible).toBe(true);
    expect(isAttractionVisibleToMembers(old, new Date('2025-01-15')).visible).toBe(false);
  });

  it('filters archived and expired entries out of the public list', () => {
    const items = [
      {
        id: 'keep-1',
        title: 'Visible',
        start: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        university: 'Visible University',
        status: 'active',
      },
      {
        id: 'archived-1',
        title: 'Archived',
        start: new Date().toISOString().slice(0, 10),
        university: 'Archived University',
        status: 'archived',
      },
      {
        id: 'drop-1',
        title: 'Old',
        start: '2020-01-01',
        university: 'Old University',
        status: 'active',
      },
    ];

    const visible = filterVisibleScheduledAttractions(items, new Date('2025-01-15'));
    expect(visible.map((item) => item.id)).toEqual(['keep-1']);
  });

  it('keeps adjacent attraction dates distinct when they are stored as YYYY-MM-DD strings', () => {
    const tomorrow = dateStringToDate('2025-01-16');
    const dayAfter = dateStringToDate('2025-01-17');

    expect(tomorrow.getFullYear()).toBe(2025);
    expect(tomorrow.getMonth()).toBe(0);
    expect(tomorrow.getDate()).toBe(16);
    expect(dayAfter.getFullYear()).toBe(2025);
    expect(dayAfter.getMonth()).toBe(0);
    expect(dayAfter.getDate()).toBe(17);
    expect(dayAfter.getTime() - tomorrow.getTime()).toBeGreaterThan(0);
  });

  it('matches rows by stable attraction id instead of row index', () => {
    const rows = [
      ['id', 'title', 'start', 'end', 'university', 'data'],
      ['row-99', 'Old', '2024-01-01', '', 'Other', JSON.stringify({ id: 'row-99', title: 'Old', start: '2024-01-01', university: 'Other' })],
      ['row-42', 'A', '2025-01-01', '', 'Uni', JSON.stringify({ id: 'row-42', title: 'A', start: '2025-01-01', university: 'Uni' })],
    ];

    expect(hasScheduledAttractionRow(rows, 'row-42')).toBe(true);
    expect(hasScheduledAttractionRow(rows, 'missing-id')).toBe(false);
  });
});
