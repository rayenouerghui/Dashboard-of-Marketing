/**
 * Environment variable getters with per-variable validation.
 * Each getter validates only the variable it needs, on demand.
 * This prevents the entire app from crashing if one variable is missing.
 */

function getRequiredVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalVar(name: string): string | undefined {
  return process.env[name];
}

// Authentication
export function getAdminUser(): string {
  return getRequiredVar("ADMIN_USER");
}

export function getAdminPasswordHash(): string {
  return getRequiredVar("ADMIN_PASSWORD_HASH");
}

// Cron Job Protection
export function getCronSecret(): string {
  const value = getRequiredVar("CRON_SECRET");
  if (value.length < 16) {
    throw new Error("CRON_SECRET must be at least 16 characters long");
  }
  return value;
}

// Google Sheets Integration
export function getGoogleSheetId(): string {
  return getRequiredVar("GOOGLE_SHEET_ID");
}

export function getGoogleSheetsClientEmail(): string {
  const value = getRequiredVar("GOOGLE_SHEETS_CLIENT_EMAIL");
  if (!value.includes("@")) {
    throw new Error("GOOGLE_SHEETS_CLIENT_EMAIL must be a valid email address");
  }
  return value;
}

export function getGoogleSheetsPrivateKey(): string {
  const value = getRequiredVar("GOOGLE_SHEETS_PRIVATE_KEY");
  if (!value.includes("PRIVATE KEY")) {
    throw new Error("GOOGLE_SHEETS_PRIVATE_KEY must be a valid PEM private key");
  }
  return value;
}

// Optional: Separate spreadsheet IDs
export function getOpportunityOgvSpreadsheetId(): string | undefined {
  return getOptionalVar("OPPORTUNITY_OGV_SPREADSHEET_ID");
}

export function getOpportunityOgtSpreadsheetId(): string | undefined {
  return getOptionalVar("OPPORTUNITY_OGT_SPREADSHEET_ID");
}

// Upstash Redis for rate limiting
export function getUpstashRedisUrl(): string | undefined {
  return getOptionalVar("UPSTASH_REDIS_REST_URL");
}

export function getUpstashRedisToken(): string | undefined {
  return getOptionalVar("UPSTASH_REDIS_REST_TOKEN");
}
