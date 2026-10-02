import { describe, it, expect } from 'vitest';
import { resolveMemberNameValue, resolveMemberNameKey } from '../googleSheetsServer';

describe('member-name resolution', () => {
  it('prefers the actual member-name field over a source/referral field', () => {
    const row = {
      'How did you hear about us?': 'Friend',
      '🙋Member Name': 'Rayen Ouerghui',
      University: 'ESPRIT',
    } as Record<string, string>;

    expect(resolveMemberNameKey(row)).toBe('🙋Member Name');
    expect(resolveMemberNameValue(row)).toBe('Rayen Ouerghui');
  });

  it('recognizes common member-name aliases even without the emoji header', () => {
    const row = {
      'How did you hear about us?': 'Facebook',
      'Member Name': 'Sarra Ben Ali',
    } as Record<string, string>;

    expect(resolveMemberNameKey(row)).toBe('Member Name');
    expect(resolveMemberNameValue(row)).toBe('Sarra Ben Ali');
  });

  it('returns empty string when no real person-name column exists', () => {
    const row = {
      'How did you hear about us?': 'Friend',
      'University': 'ESPRIT',
    } as Record<string, string>;

    expect(resolveMemberNameKey(row)).toBeNull();
    expect(resolveMemberNameValue(row)).toBe('');
  });

  it('honors the explicit RANKING_NAME_COLUMN override even when it is a referral field', () => {
    process.env.RANKING_NAME_COLUMN = '📢Referral';
    try {
      const row = {
        '📢Referral': 'Jane Doe',
        '🙋Member Name': 'Information booth on campus',
        'Submitted at': '2026-09-15',
      } as Record<string, string>;

      expect(resolveMemberNameKey(row)).toBe('📢Referral');
      expect(resolveMemberNameValue(row)).toBe('Jane Doe');
    } finally {
      delete process.env.RANKING_NAME_COLUMN;
    }
  });

  it('accepts a configured member-name header even when the source column is also present', () => {
    process.env.RANKING_NAME_COLUMN = 'Member Name';
    try {
      const row = {
        'Referral': 'Friend',
        'Member Name': 'Alice Johnson',
        'Submitted at': '2026-09-15',
      } as Record<string, string>;

      expect(resolveMemberNameKey(row)).toBe('Member Name');
      expect(resolveMemberNameValue(row)).toBe('Alice Johnson');
    } finally {
      delete process.env.RANKING_NAME_COLUMN;
    }
  });
});
