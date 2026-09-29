/**
 * Sanitization utilities for Google Sheets data
 * Prevents formula injection and limits string lengths
 */

/**
 * Sanitizes a string for safe storage in Google Sheets
 * - Prefixes with single quote if it starts with =, +, -, @, tab, or carriage return
 * - Trims whitespace
 * - Limits length to specified max
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input;
  
  // Prefix with single quote if it starts with a formula trigger (before trim)
  const firstChar = sanitized.charAt(0);
  if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
    sanitized = `'${sanitized}`;
  }
  
  // Trim whitespace after prefixing
  sanitized = sanitized.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitizes all string values in an object (recursively handles nested objects and arrays)
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldLimits: Record<string, number> = {}
): T {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') {
        return sanitizeString(item, 500);
      }
      return sanitizeObject(item as any, fieldLimits);
    }) as unknown as T;
  }
  
  const sanitized = { ...obj } as any;
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      const maxLength = fieldLimits[key] || 500;
      sanitized[key] = sanitizeString(sanitized[key], maxLength);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key], fieldLimits);
    }
  }
  
  return sanitized as T;
}
