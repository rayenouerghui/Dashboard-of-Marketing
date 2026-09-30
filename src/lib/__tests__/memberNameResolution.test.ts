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
});
