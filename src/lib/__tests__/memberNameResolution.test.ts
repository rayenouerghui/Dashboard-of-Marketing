import { describe, it, expect } from 'vitest';
import { buildMemberRanking } from '../ranking';
import { resolveMemberNameValue, resolveMemberNameKey, resolveMemberNameKeyForRows } from '../googleSheetsServer';

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

  it('uses the configured index only for rows on or after the cutoff', () => {
    process.env.RANKING_NAME_COLUMN_INDEX = '18';
    try {
      const oldRows = [
        {
          'Submitted at': '2026-08-15',
          'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'C15': '', 'C16': '', 'Referral': 'Information booth on campus', 'Member Name': 'Old Person',
        },
      ];
      const newRows = [
        {
          'Submitted at': '2026-09-15',
          'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'C15': '', 'C16': '', 'Referral': 'Friend', 'Member Name': 'Alice Johnson',
        },
        { 'Submitted at': '2026-09-16', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'C15': '', 'C16': '', 'Referral': 'Instagram', 'Member Name': 'Bob Smith' },
        { 'Submitted at': '2026-09-17', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'C15': '', 'C16': '', 'Referral': 'Classroom', 'Member Name': 'Chloe Martin' },
        { 'Submitted at': '2026-09-18', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'C15': '', 'C16': '', 'Referral': 'Friend', 'Member Name': 'Dina Ali' },
        { 'Submitted at': '2026-09-19', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'C15': '', 'C16': '', 'Referral': 'Facebook', 'Member Name': 'Eya Chraiet' },
      ];

      expect(resolveMemberNameKeyForRows(oldRows, '2026-09-01')).toBeNull();
      expect(resolveMemberNameKeyForRows(newRows, '2026-09-01')).toBe('Member Name');
    } finally {
      delete process.env.RANKING_NAME_COLUMN_INDEX;
    }
  });

  it('picks the positional member-name column when the outdated header row still names the referral column', () => {
    const rows = [
      {
        'Submitted at': '2026-09-01',
        'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'Business & AI': 'Yes', 'Other': 'No', '🙋Member Name': 'Information booth on campus', '💻Are you interested to attend a hackathon ?': 'Imen Melki',
      },
      { 'Submitted at': '2026-09-02', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'Business & AI': 'Yes', 'Other': 'No', '🙋Member Name': 'Information booth on campus', '💻Are you interested to attend a hackathon ?': 'Imen Melki' },
      { 'Submitted at': '2026-09-03', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'Business & AI': 'No', 'Other': 'Yes', '🙋Member Name': 'Instagram', '💻Are you interested to attend a hackathon ?': 'Chadha Ibidhi' },
      { 'Submitted at': '2026-09-04', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'Business & AI': 'No', 'Other': 'Yes', '🙋Member Name': 'Facebook', '💻Are you interested to attend a hackathon ?': 'Sarra Ben Ali' },
      { 'Submitted at': '2026-09-05', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'Business & AI': 'Yes', 'Other': 'No', '🙋Member Name': 'Friend', '💻Are you interested to attend a hackathon ?': 'Nour Chraiet' },
      { 'Submitted at': '2026-09-06', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'Business & AI': 'Yes', 'Other': 'No', '🙋Member Name': 'Classroom', '💻Are you interested to attend a hackathon ?': 'Yosr Gouja' },
    ];

    expect(resolveMemberNameKeyForRows(rows, '2026-09-01')).toBe('💻Are you interested to attend a hackathon ?');
    expect(buildMemberRanking(rows, { cutoff: '2026-09-01' }).members.map((member) => member.name).sort()).toEqual(['Chadha Ibidhi', 'Imen Melki', 'Nour Chraiet', 'Sarra Ben Ali', 'Yosr Gouja']);
  });

  it('keeps the corrected layout working when Referral is at 17 and Member Name is at 18', () => {
    const rows = [
      {
        'Submitted at': '2026-09-01',
        'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'Business & AI': 'Yes', 'Other': 'No', 'Referral': 'Friend', 'Member Name': 'eya chraiet',
      },
      { 'Submitted at': '2026-09-02', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'Business & AI': 'Yes', 'Other': 'No', 'Referral': 'Instagram', 'Member Name': 'Eya   Chraiet' },
      { 'Submitted at': '2026-09-03', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'Business & AI': 'No', 'Other': 'Yes', 'Referral': 'Classroom', 'Member Name': 'Yosr Gouja' },
      { 'Submitted at': '2026-09-04', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'Business & AI': 'Yes', 'Other': 'No', 'Referral': 'Friend', 'Member Name': 'Sarra Ben Ali' },
      { 'Submitted at': '2026-09-05', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'Business & AI': 'No', 'Other': 'Yes', 'Referral': 'Facebook', 'Member Name': 'Nour Chraiet' },
      { 'Submitted at': '2026-09-06', 'C2': '', 'C3': '', 'C4': '', 'C5': '', 'C6': '', 'C7': '', 'C8': '', 'C9': '', 'C10': '', 'C11': '', 'C12': '', 'C13': '', 'C14': '', 'Business & AI': 'Yes', 'Other': 'No', 'Referral': 'Instagram', 'Member Name': 'Imen Melki' },
    ];

    expect(resolveMemberNameKeyForRows(rows, '2026-09-01')).toBe('Member Name');
    const result = buildMemberRanking(rows, { cutoff: '2026-09-01' });
    expect(result.totalLeads).toBe(6);
    expect(result.members).toHaveLength(5);
    expect(result.members.find((member) => member.name === 'Eya Chraiet')?.totalLeads).toBe(2);
  });

  it('ignores rows before the cutoff and excludes blank member names from the leaderboard while keeping totals', () => {
    const rows = [
      { 'Submitted at': '2026-08-20', 'Referral': 'Friend', 'Member Name': 'Alice' },
      { 'Submitted at': '2026-09-02', 'Referral': 'Friend', 'Member Name': '' },
      { 'Submitted at': '2026-09-03', 'Referral': 'Instagram', 'Member Name': 'Yosr Gouja' },
      { 'Submitted at': '2026-09-04', 'Referral': 'Classroom presentation', 'Member Name': 'Yosr Gouja' },
      { 'Submitted at': '2026-09-05', 'Referral': 'Other', 'Member Name': 'Imen Melki' },
      { 'Submitted at': '2026-09-06', 'Referral': 'Friend', 'Member Name': 'Imen Melki' },
    ];

    const result = buildMemberRanking(rows, { cutoff: '2026-09-01' });
    expect(result.rowsSinceCutoff).toBe(5);
    expect(result.totalLeads).toBe(5);
    expect(result.members.map((member) => member.name)).toEqual(['Imen Melki', 'Yosr Gouja']);
    expect(result.rowsSkippedBlankName).toBe(1);
  });

  it('falls back to detection when the default name column has yes-no values', () => {
    const rows = [
      { 'Submitted at': '2026-09-02', 'Business & AI': 'Alice Johnson', 'Other': 'No', 'Referral': 'Friend', 'Interested': 'Yes' },
      { 'Submitted at': '2026-09-03', 'Business & AI': 'Bob Smith', 'Other': 'Yes', 'Referral': 'Instagram', 'Interested': 'No' },
      { 'Submitted at': '2026-09-04', 'Business & AI': 'Chloe Martin', 'Other': 'No', 'Referral': 'Classroom', 'Interested': 'Yes' },
      { 'Submitted at': '2026-09-05', 'Business & AI': 'Dina Ali', 'Other': 'Yes', 'Referral': 'Friend', 'Interested': 'Yes' },
      { 'Submitted at': '2026-09-06', 'Business & AI': 'Eya Chraiet', 'Other': 'No', 'Referral': 'Instagram', 'Interested': 'No' },
      { 'Submitted at': '2026-09-07', 'Business & AI': 'Fahd Ben', 'Other': 'No', 'Referral': 'Referral', 'Interested': 'No' },
      { 'Submitted at': '2026-09-08', 'Business & AI': 'Ghada Salem', 'Other': 'No', 'Referral': 'Friend', 'Interested': 'Yes' },
    ];
    const detection = resolveMemberNameKeyForRows(rows, '2026-09-01');
    expect(detection).toBe('Business & AI');
  });

  it('flags a full sheet when the data rows fill the grid', () => {
    const rows = [
      { 'Submitted at': '2026-09-01', 'Referral': 'Friend', 'Member Name': 'Alice' },
      { 'Submitted at': '2026-09-02', 'Referral': 'Instagram', 'Member Name': 'Bob' },
    ];
    const ranking = buildMemberRanking(rows, { cutoff: '2026-09-01', gridRowCount: 3 });
    expect(ranking.gridRowCount).toBe(3);
    expect(ranking.sheetGridFull).toBe(true);
  });

  it('flags a full sheet when the data rows fill the grid', () => {
    const rows = [
      { C1: 'Submitted at', C2: 'Referral', C3: 'Member Name' },
      { C1: '2026-09-01', C2: 'Friend', C3: 'Alice' },
      { C1: '2026-09-02', C2: 'Instagram', C3: 'Bob' },
    ];
    const ranking = buildMemberRanking(rows, { cutoff: '2026-09-01' });
    expect(ranking.gridRowCount).toBeGreaterThanOrEqual(3);
    expect(ranking.sheetGridFull).toBe(true);
  });
});
