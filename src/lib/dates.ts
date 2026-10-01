/**
 * Date helpers using Africa/Tunis timezone
 * All date operations should use these helpers for consistency
 */

import { format, fromZonedTime, toZonedTime } from "date-fns-tz";
import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  endOfDay, 
  endOfWeek, 
  endOfMonth,
  isSameDay,
  isAfter,
  isBefore,
  parseISO,
  isValid
} from "date-fns";

const TIMEZONE = "Africa/Tunis";

/**
 * Get current date in Africa/Tunis timezone
 */
export function nowInTunis(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Get today's date string in Africa/Tunis timezone (YYYY-MM-DD)
 */
export function todayInTunis(): string {
  return format(nowInTunis(), "yyyy-MM-dd", { timeZone: TIMEZONE });
}

/**
 * Get start of day in Africa/Tunis timezone
 */
export function startOfDayInTunis(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(startOfDay(d), TIMEZONE);
}

/**
 * Get end of day in Africa/Tunis timezone
 */
export function endOfDayInTunis(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(endOfDay(d), TIMEZONE);
}

/**
 * Get start of week (Monday) in Africa/Tunis timezone
 */
export function startOfWeekInTunis(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(startOfWeek(d, { weekStartsOn: 1 }), TIMEZONE);
}

/**
 * Get end of week (Sunday) in Africa/Tunis timezone
 */
export function endOfWeekInTunis(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(endOfWeek(d, { weekStartsOn: 1 }), TIMEZONE);
}

/**
 * Get start of month in Africa/Tunis timezone
 */
export function startOfMonthInTunis(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(startOfMonth(d), TIMEZONE);
}

/**
 * Get end of month in Africa/Tunis timezone
 */
export function endOfMonthInTunis(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(endOfMonth(d), TIMEZONE);
}

/**
 * Check if a date is today in Africa/Tunis timezone
 */
export function isTodayInTunis(date: Date | string): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  return isSameDay(toZonedTime(d, TIMEZONE), nowInTunis());
}

/**
 * Check if a date is within the current week in Africa/Tunis timezone
 */
export function isThisWeekInTunis(date: Date | string): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  const weekStart = startOfWeekInTunis(nowInTunis());
  const weekEnd = endOfWeekInTunis(nowInTunis());
  const tzDate = toZonedTime(d, TIMEZONE);
  return !isBefore(tzDate, weekStart) && !isAfter(tzDate, weekEnd);
}

/**
 * Check if a date is within the current month in Africa/Tunis timezone
 */
export function isThisMonthInTunis(date: Date | string): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  const monthStart = startOfMonthInTunis(nowInTunis());
  const monthEnd = endOfMonthInTunis(nowInTunis());
  const tzDate = toZonedTime(d, TIMEZONE);
  return !isBefore(tzDate, monthStart) && !isAfter(tzDate, monthEnd);
}

/**
 * Format date in Africa/Tunis timezone
 */
export function formatDateInTunis(date: Date | string, formatStr: string = "yyyy-MM-dd"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(toZonedTime(d, TIMEZONE), formatStr, { timeZone: TIMEZONE });
}

/**
 * Parse date string and convert to Africa/Tunis timezone
 */
export function parseDateInTunis(dateStr: string): Date {
  return toZonedTime(parseISO(dateStr), TIMEZONE);
}

function parseGoogleSheetsSerial(value: number): Date | null {
  if (!Number.isFinite(value)) return null;
  const ms = (value - 25569) * 86400000;
  const date = new Date(ms);
  return isValid(date) ? date : null;
}

function parseSlashDate(value: string): Date | null {
  const match = value.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*$/);
  if (!match) return null;

  let part1 = Number(match[1]);
  let part2 = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4] ?? "0");
  const minute = Number(match[5] ?? "0");
  const second = Number(match[6] ?? "0");

  let day: number;
  let month: number;

  if (part1 > 12 && part2 <= 12) {
    day = part1;
    month = part2;
  } else if (part2 > 12 && part1 <= 12) {
    month = part1;
    day = part2;
  } else {
    day = part1;
    month = part2;
  }

  const local = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
  const parsed = fromZonedTime(local, TIMEZONE);
  return isValid(parsed) ? parsed : null;
}

export function parseSubmittedAt(raw: unknown): Date | null {
  if (raw == null) return null;

  if (typeof raw === "number") return parseGoogleSheetsSerial(raw);

  const value = String(raw).trim();
  if (!value) return null;

  if (/^\d+(?:\.\d+)?$/.test(value)) {
    return parseGoogleSheetsSerial(Number(value));
  }

  const isoLike = value.replace(/\s+/, "T");
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value)) {
    const normalized = value.includes("T") || value.includes(" ") ? value.replace(" ", "T") : `${value}T00:00:00`;
    const parsed = normalized.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(normalized)
      ? new Date(normalized)
      : fromZonedTime(normalized, TIMEZONE);
    return isValid(parsed) ? parsed : null;
  }

  if (value.includes("/")) {
    return parseSlashDate(value);
  }

  const parsed = new Date(value);
  return isValid(parsed) ? parsed : null;
}

/**
 * Get date bounds for today, this week, and this month in Africa/Tunis timezone
 */
export function getDateBoundsInTunis() {
  const now = nowInTunis();
  const today = formatDateInTunis(now, "yyyy-MM-dd");
  const weekStart = formatDateInTunis(startOfWeekInTunis(now), "yyyy-MM-dd");
  const monthStart = formatDateInTunis(startOfMonthInTunis(now), "yyyy-MM-dd");
  
  return { today, weekStart, monthStart };
}
