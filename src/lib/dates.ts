/**
 * Date helpers using Africa/Tunis timezone
 * All date operations should use these helpers for consistency
 */

import { format, toZonedTime } from "date-fns-tz";
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
  parseISO
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
