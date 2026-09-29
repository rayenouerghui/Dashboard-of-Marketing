import { describe, it, expect } from 'vitest';
import { sanitizeString, sanitizeObject } from '../sanitize';

describe('Sanitize Helpers', () => {
  describe('sanitizeString', () => {
    it('should prefix strings starting with = with single quote', () => {
      expect(sanitizeString('=IMPORTXML("http://x")')).toBe("'=IMPORTXML(\"http://x\")");
    });

    it('should prefix strings starting with + with single quote', () => {
      expect(sanitizeString('+1')).toBe("'+1");
    });

    it('should prefix strings starting with - with single quote', () => {
      expect(sanitizeString('-1')).toBe("'-1");
    });

    it('should prefix strings starting with @ with single quote', () => {
      expect(sanitizeString('@SUM(A1)')).toBe("'@SUM(A1)");
    });

    it('should prefix strings starting with tab with single quote', () => {
      // Tab is prefixed before trim, so it's preserved
      expect(sanitizeString('\ttest')).toBe("'\ttest");
    });

    it('should prefix strings starting with carriage return with single quote', () => {
      // Carriage return is prefixed before trim, so it's preserved
      expect(sanitizeString('\rtest')).toBe("'\rtest");
    });

    it('should not modify normal strings', () => {
      expect(sanitizeString('normal text')).toBe('normal text');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  normal text  ')).toBe('normal text');
    });

    it('should truncate overly long strings', () => {
      const longString = 'a'.repeat(1000);
      const result = sanitizeString(longString, 100);
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toBe('a'.repeat(100));
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string properties in an object', () => {
      const input = {
        name: '=IMPORTXML("http://x")',
        notes: '+1',
        count: 5,
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe("'=IMPORTXML(\"http://x\")");
      expect(result.notes).toBe("'+1");
      expect(result.count).toBe(5);
    });

    it('should apply per-field length limits', () => {
      const input = {
        title: 'a'.repeat(300),
        notes: 'b'.repeat(1000),
      };
      const result = sanitizeObject(input, { title: 200, notes: 500 });
      expect(result.title.length).toBeLessThanOrEqual(200);
      expect(result.notes.length).toBeLessThanOrEqual(500);
    });

    it('should handle nested objects', () => {
      const input = {
        nested: {
          name: '=SUM(A1)',
        },
      };
      const result = sanitizeObject(input);
      expect(result.nested.name).toBe("'=SUM(A1)");
    });

    it('should handle arrays', () => {
      const input = {
        items: ['=1', '+2', 'normal'],
      };
      const result = sanitizeObject(input);
      expect(result.items[0]).toBe("'=1");
      expect(result.items[1]).toBe("'+2");
      expect(result.items[2]).toBe('normal');
    });
  });
});
