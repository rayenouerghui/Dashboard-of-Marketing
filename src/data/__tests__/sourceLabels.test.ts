import { describe, it, expect } from 'vitest';
import { isSourceLabel } from '../sourceLabels';

describe('isSourceLabel', () => {
  it('excludes predefined source labels in various cases and spacings', () => {
    expect(isSourceLabel('Friend')).toBe(true);
    expect(isSourceLabel('friends')).toBe(true);
    expect(isSourceLabel(' FRIEND ')).toBe(true);
    expect(isSourceLabel('Information')).toBe(true);
    expect(isSourceLabel('Classroom')).toBe(true);
    expect(isSourceLabel('Walk-in')).toBe(true);
    expect(isSourceLabel('')).toBe(true);
    expect(isSourceLabel('   ')).toBe(true);
  });

  it('excludes prefix-based labels', () => {
    expect(isSourceLabel('Heard by friend')).toBe(true);
    expect(isSourceLabel('heard by someone')).toBe(true);
    expect(isSourceLabel('from facebook')).toBe(true);
    expect(isSourceLabel('via internet')).toBe(true);
    expect(isSourceLabel('through a friend')).toBe(true);
  });

  it('keeps real person names', () => {
    expect(isSourceLabel('Rayen Ouerghui')).toBe(false);
    expect(isSourceLabel('Sarra Ben Ali')).toBe(false);
    // A real person whose name contains one of the words must not be excluded
    expect(isSourceLabel('Google Ben Ali')).toBe(false);
    expect(isSourceLabel('Friend of mine? No, a real name')).toBe(false); // does not start with prefix
    expect(isSourceLabel('Ali Friends')).toBe(false);
  });
});
