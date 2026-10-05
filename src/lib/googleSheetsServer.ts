// This file is server-side only. Do not import in client components.
//
// NOTE: `googleapis` is imported lazily (not at module top-level) because its
// massive type + bundle tree causes webpack / tsc / Node to OOM-crash
// (0xE06D7363 / 3765269347) on Windows when pages like /member-dashboard
// first pull this module into the compile graph. Similarly, env validation
// is deferred to runtime (inside the functions that actually need the values)
// so the module can never throw at module-eval time and kill the dev server.
//
// FALLBACK: If Google Sheets environment variables are not set, the functions
// will fall back to reading from static JSON files in src/data/

import { DEFAULT_NAME_COLUMN_INDEX, DEFAULT_REFERRAL_COLUMN_INDEX, SHEET_LAYOUT_VERSION } from "@/data/sheetsConfig";
import { isSourceLabel } from "@/data/sourceLabels";
import { getGoogleSheetId, getGoogleSheetsClientEmail, getGoogleSheetsPrivateKey, getOpportunityOgvSpreadsheetId, getOpportunityOgtSpreadsheetId } from "./env";
import { formatDateInTunis, parseSubmittedAt } from "./dates";
import { sanitizeString } from "./sanitize";

function toCamelCase(header: string): string {
  // Preserve emojis and special characters, only convert spaces to camelCase
  // This keeps column names like "🌍 Type Of Abroad Internship (Volunteering Internship)" intact
  return header.trim();
}

export async function getGoogleApis() {
  const mod = await import("googleapis");
  return mod.google;
}

function escapeA1SheetName(tabName: string) {
  return tabName.replace(/'/g, "''");
}

function normalizeSheetTitle(tabName: string) {
  return tabName.trim().toLowerCase();
}

export function getConfiguredNameColumnIndex(): number | null {
  const value = process.env.RANKING_NAME_COLUMN_INDEX?.trim();
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || !Number.isInteger(parsed)) return null;
  return parsed;
}

function getColumnHeaderAtIndex(row: Record<string, string> | null | undefined, index: number): string | null {
  if (!row) return null;
  const keys = Object.keys(row);
  const header = keys[index - 1];
  return header ?? null;
}

function normalizePersonNameCandidate(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s'’-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLikePersonNameValue(value: string): boolean {
  const cleaned = normalizePersonNameCandidate(value);
  if (!cleaned) return false;
  if (isSourceLabel(cleaned)) return false;

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  return words.every((word) => /^[\p{L}]+(?:['’-][\p{L}]+)*$/u.test(word));
}

export function looksLikeMemberNameHeader(header: string): boolean {
  const normalized = normalizeHeaderName(header);
  if (!normalized) return false;
  if (["source", "referral", "heard", "interest", "channel", "where", "how", "business", "ai"].some((block) => normalized.includes(block))) {
    return false;
  }
  return ["membername", "fullname", "name", "attractedby", "attractor", "owner", "consultant", "manager", "epmanager"].some((token) => normalized.includes(token));
}

export function getColumnGuardSummary(
  rows: Record<string, string>[],
  header: string,
  cutoff: string = "2026-09-01",
) {
  const sinceCutoffRows = rowsSinceCutoff(rows, cutoff);
  const values = sinceCutoffRows
    .map((row) => String(row[header] ?? "").trim())
    .filter(Boolean)
    .map((value) => normalizePersonNameCandidate(value))
    .filter(Boolean);

  if (values.length === 0) return { passes: false, reason: "no-values", distinctCount: 0, topValueShare: 0 };

  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const distinctCount = counts.size;
  const topValueShare = Math.max(...Array.from(counts.values())) / values.length;
  const validPatternRatio = values.filter((value) => looksLikePersonNameValue(value)).length / values.length;
  const passes = values.length >= 5 && distinctCount >= 5 && topValueShare <= 0.6 && validPatternRatio >= 0.8 && values.every((value) => !isSourceLabel(value));

  return {
    passes,
    distinctCount,
    topValueShare,
    validPatternRatio,
    reason: passes ? "ok" : "guard-failed",
  };
}

export function memberNameColumnPassesGuard(
  rows: Record<string, string>[],
  header: string,
  cutoff: string = "2026-09-01",
): boolean {
  return getColumnGuardSummary(rows, header, cutoff).passes;
}

export function chooseMemberNameColumn(
  rows: Record<string, string>[] | null | undefined,
  cutoff: string = "2026-09-01",
): { header: string | null; index: number | null; source: "env-index" | "env-header" | "default-index" | "detected" | null } {
  if (!rows || rows.length === 0) return { header: null, index: null, source: null };

  const relevantRows = rowsSinceCutoff(rows, cutoff);
  if (cutoff && relevantRows.length === 0) return { header: null, index: null, source: null };

  const referenceRow = relevantRows[0] ?? rows[0];
  const keys = Object.keys(referenceRow);
  const configuredIndex = getConfiguredNameColumnIndex();
  if (configuredIndex) {
    const header = getColumnHeaderAtIndex(referenceRow, configuredIndex) ?? keys.find((key) => normalizeHeaderName(key).includes("membername") || normalizeHeaderName(key).includes("fullname") || normalizeHeaderName(key).includes("name"));
    if (header && memberNameColumnPassesGuard(rows, header, cutoff)) {
      if (!looksLikeMemberNameHeader(header)) {
        console.warn(`[googleSheetsServer] Chosen member-name column at index ${configuredIndex} does not look like a person-name header: ${header}`);
      }
      return { header, index: configuredIndex, source: "env-index" };
    }
  }

  const configuredHeader = process.env.RANKING_NAME_COLUMN?.trim();
  if (configuredHeader) {
    const exactMatch = keys.find((key) => normalizeHeaderName(key) === normalizeHeaderName(configuredHeader));
    if (exactMatch && memberNameColumnPassesGuard(rows, exactMatch, cutoff)) {
      if (!looksLikeMemberNameHeader(exactMatch)) {
        console.warn(`[googleSheetsServer] Chosen member-name column header does not look like a person-name field: ${exactMatch}`);
      }
      return { header: exactMatch, index: keys.findIndex((key) => key === exactMatch) + 1, source: "env-header" };
    }
  }

  const defaultIndex = DEFAULT_NAME_COLUMN_INDEX;
  const defaultHeader = getColumnHeaderAtIndex(referenceRow, defaultIndex) ?? keys.find((key) => normalizeHeaderName(key) === "membername" || normalizeHeaderName(key).includes("member") && normalizeHeaderName(key).includes("name"));
  if (defaultHeader && memberNameColumnPassesGuard(rows, defaultHeader, cutoff)) {
    if (!looksLikeMemberNameHeader(defaultHeader)) {
      console.warn(`[googleSheetsServer] Default member-name column at index ${defaultIndex} does not look like a person-name header: ${defaultHeader}`);
    }
    return { header: defaultHeader, index: defaultIndex, source: "default-index" };
  }

  const positionalHeaders = Array.from({ length: Math.max(19, keys.length) }, (_, idx) => getColumnHeaderAtIndex(referenceRow, idx + 1)).filter((value): value is string => Boolean(value));
  const fallbackHeaders = keys.filter((key) => !positionalHeaders.includes(key));
  const orderedCandidates = [...new Set([...positionalHeaders, ...fallbackHeaders])];

  for (const candidate of orderedCandidates) {
    if (!candidate) continue;
    const index = keys.indexOf(candidate) + 1;
    if (memberNameColumnPassesGuard(rows, candidate, cutoff)) {
      if (!looksLikeMemberNameHeader(candidate)) {
        console.warn(`[googleSheetsServer] Detected member-name column at index ${index} does not look like a person-name header: ${candidate}`);
      }
      return { header: candidate, index: index || null, source: "detected" };
    }
  }

  return { header: null, index: null, source: null };
}

export function resolveMemberNameKeyForRows(
  rows: Record<string, string>[] | null | undefined,
  cutoff?: string,
): string | null {
  const selected = chooseMemberNameColumn(rows, cutoff ?? "2026-09-01");
  return selected.header;
}

async function listSpreadsheetSheetTitles(
  sheets: Awaited<ReturnType<Awaited<ReturnType<typeof getGoogleApis>>["sheets"]>>, 
  spreadsheetId: string,
) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title,hidden))",
  });

  return (meta.data.sheets ?? [])
    .map((sheet: any) => sheet?.properties?.title)
    .filter((title: unknown): title is string => typeof title === "string" && title.length > 0);
}

function resolveSheetTitle(requestedTabName: string, availableTitles: string[]) {
  const exact = availableTitles.find((title) => title === requestedTabName);
  if (exact) return exact;

  const trimmed = availableTitles.find((title) => title.trim() === requestedTabName.trim());
  if (trimmed) return trimmed;

  const normalized = availableTitles.find((title) => normalizeSheetTitle(title) === normalizeSheetTitle(requestedTabName));
  return normalized ?? requestedTabName;
}

function makeTabRowsSummary(rows: string[][]) {
  const [headerRow = [], ...dataRows] = rows;
  const normalizedHeaders = headerRow.map((value) => normalizeHeaderName(String(value ?? ""))).filter(Boolean);
  const hasSubmittedAt = normalizedHeaders.some((header) => header.includes("submittedat") || header.includes("submittedat") || header.includes("submitted"));
  const hasMemberName = normalizedHeaders.some((header) => header.includes("membername") || header.includes("member") && header.includes("name"));
  const hasBusinessAi = normalizedHeaders.some((header) => {
    const normalized = normalizeHeaderName(String(header ?? ""));
    return normalized.includes("business") && normalized.includes("ai");
  });

  let latestSubmittedAt: Date | null = null;
  let rowsSinceCutoff = 0;

  for (const row of dataRows) {
    if (!row.some((cell) => String(cell ?? "").trim() !== "")) continue;
    const record = Object.fromEntries(headerRow.map((header, index) => [String(header ?? ""), String(row[index] ?? "")]));
    const submittedAt = record["Submitted at"] ?? record["submittedAt"] ?? record["submitted_at"] ?? "";
    const parsed = parseSubmittedAt(submittedAt);
    if (!parsed) continue;
    if (!latestSubmittedAt || parsed.getTime() > latestSubmittedAt.getTime()) {
      latestSubmittedAt = parsed;
    }
    const day = formatDateInTunis(parsed, "yyyy-MM-dd");
    if (day >= "2026-09-01") {
      rowsSinceCutoff++;
    }
  }

  return {
    hasSubmittedAt,
    hasMemberName,
    hasBusinessAi,
    latestSubmittedAt,
    rowsSinceCutoff,
    headerRow,
    normalizedHeaders,
  };
}

export function pickBestRankingSheetTab(
  tabs: Array<{ name: string; rows: string[][] }>,
): string | null {
  const configuredTab = process.env.RANKING_SHEET_TAB?.trim();

  if (configuredTab) {
    const matched = tabs.find((tab) => normalizeSheetTitle(tab.name) === normalizeSheetTitle(configuredTab));
    if (matched) return matched.name;
    console.warn(`[googleSheetsServer] RANKING_SHEET_TAB="${configuredTab}" did not match any available sheet tab; falling back to auto-selection.`);
  }

  const candidates = tabs
    .map((tab) => ({
      name: tab.name,
      ...makeTabRowsSummary(tab.rows),
    }))
    .filter((tab) => tab.hasSubmittedAt && tab.hasMemberName)
    .sort((a, b) => {
      if (b.latestSubmittedAt && a.latestSubmittedAt) {
        const diff = b.latestSubmittedAt.getTime() - a.latestSubmittedAt.getTime();
        if (diff !== 0) return diff;
      }
      if (b.hasBusinessAi !== a.hasBusinessAi) return Number(b.hasBusinessAi) - Number(a.hasBusinessAi);
      return b.rowsSinceCutoff - a.rowsSinceCutoff;
    });

  if (candidates.length === 0) {
    return null;
  }

  const best = candidates[0];
  if (!best.hasSubmittedAt || !best.hasMemberName) {
    return null;
  }

  return best.name;
}

export function normalizeHeaderName(header: string) {
  return header
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase()
    .trim();
}

export const MEMBER_NAME_HEADERS = [
  "membername",
  "attractedby",
  "attractor",
  "epmanager",
  "consultant",
  "owner",
  "fullname",
  "membernameemoji",
];

export const MEMBER_NAME_HEADER_BLOCKLIST = [
  "hear",
  "howdidyou",
  "source",
  "channel",
  "referral",
  "foundout",
  "where",
  "howdidyouhearaboutus",
];

function matchesMemberNameHeader(header: string): boolean {
  const normalized = normalizeHeaderName(header);
  if (!normalized) return false;
  if (MEMBER_NAME_HEADER_BLOCKLIST.some((blocked) => normalized.includes(blocked))) return false;
  return MEMBER_NAME_HEADERS.includes(normalized);
}

export function getMemberNameHeaderCandidates(headers: string[]): string[] {
  return headers.filter((header) => matchesMemberNameHeader(header));
}

export function getMemberNameAudit(row: Record<string, string> | null | undefined) {
  const headers = row ? Object.keys(row) : [];
  const headersSeen = headers.map(normalizeHeaderName).filter(Boolean);
  const candidateHeaders = getMemberNameHeaderCandidates(headers);
  const configuredOverride = process.env.RANKING_NAME_COLUMN?.trim();
  const nameColumnHeader = configuredOverride
    ? headers.find((header) => normalizeHeaderName(header) === normalizeHeaderName(configuredOverride)) ?? null
    : candidateHeaders[0] ?? null;

  return {
    headersSeen,
    candidateHeaders,
    nameColumnHeader,
  };
}

export function rowsSinceCutoff(rows: Record<string, string>[], cutoff: string = "2026-09-01") {
  return rows.filter((row) => {
    const submittedAt = row["Submitted at"] || row.submittedAt || row.submitted_at || "";
    const value = submittedAt.trim();
    if (!value) return false;

    const parsed = parseSubmittedAt(value);
    if (!parsed) return false;

    const rowDate = formatDateInTunis(parsed, "yyyy-MM-dd");
    return rowDate >= cutoff;
  });
}

export function analyzeMemberNameColumn(rows: Record<string, string>[], options: { cutoff?: string } = {}) {
  const cutoff = options.cutoff ?? "2026-09-01";
  const sinceCutoffRows = rowsSinceCutoff(rows, cutoff);
  const headersSeen = Array.from(new Set(rows.flatMap((row) => Object.keys(row)).map(normalizeHeaderName).filter(Boolean)));
  const nameColumnHeader = resolveMemberNameKeyForRows(rows, cutoff);

  if (!nameColumnHeader) {
    return {
      valid: false,
      error: "MEMBER_NAME_COLUMN_NOT_FOUND",
      headersSeen,
      nameColumnHeader: null,
      reason: "no-explicit-member-name-column",
      rowsSinceCutoff: sinceCutoffRows.length,
      cutoff,
    };
  }

  const values = sinceCutoffRows
    .map((row) => String(row[nameColumnHeader] ?? "").trim())
    .filter((value) => value.length > 0);

  if (values.length === 0) {
    return {
      valid: false,
      error: "MEMBER_NAME_COLUMN_NOT_FOUND",
      headersSeen,
      nameColumnHeader,
      reason: values.length === 0 ? "no-rows-since-cutoff" : "member-name-column-empty",
      rowsSinceCutoff: sinceCutoffRows.length,
      cutoff,
    };
  }

  const distinctValues = new Set(values.map((value) => value.toLowerCase().trim()));
  const wordCounts = values.map((value) => value.trim().split(/\s+/).filter(Boolean).length);
  const averageWords = wordCounts.reduce((sum, count) => sum + count, 0) / wordCounts.length;
  const topValueCount = [...distinctValues].reduce((max, value) => {
    const count = values.filter((item) => item.toLowerCase().trim() === value).length;
    return Math.max(max, count);
  }, 0);

  const invalidBecauseTooFew = distinctValues.size < 2;
  const invalidBecauseDominant = topValueCount / values.length > 0.5;
  const invalidBecauseSentenceLike = averageWords > 3;

  if (invalidBecauseTooFew || invalidBecauseDominant || invalidBecauseSentenceLike) {
    return {
      valid: false,
      error: "MEMBER_NAME_COLUMN_NOT_FOUND",
      headersSeen,
      nameColumnHeader,
      reason: invalidBecauseTooFew
        ? "too-few-distinct-values"
        : invalidBecauseDominant
          ? "single-value-dominates"
          : "sentence-like-values",
      rowsSinceCutoff: sinceCutoffRows.length,
      cutoff,
    };
  }

  return {
    valid: true,
    error: null,
    headersSeen,
    nameColumnHeader,
    reason: null,
    rowsSinceCutoff: sinceCutoffRows.length,
    cutoff,
  };
}

let memberNameHeaderWarningShown = false;

export function resolveMemberNameKey(row: Record<string, string> | null | undefined): string | null {
  if (!row) return null;

  const keys = Object.keys(row);
  const configuredIndex = getConfiguredNameColumnIndex();
  if (configuredIndex) {
    const header = getColumnHeaderAtIndex(row, configuredIndex);
    if (header) return header;
  }

  const configuredOverride = process.env.RANKING_NAME_COLUMN?.trim();
  if (configuredOverride) {
    const exactMatch = keys.find((key) => normalizeHeaderName(key) === normalizeHeaderName(configuredOverride));
    if (exactMatch) return exactMatch;
  }

  const candidate = keys.find((key) => matchesMemberNameHeader(key));
  return candidate ?? null;
}

export function resolveMemberNameValue(row: Record<string, string> | null | undefined): string {
  const key = resolveMemberNameKey(row);
  if (!key) {
    if (!memberNameHeaderWarningShown) {
      const available = row ? Object.keys(row).slice(0, 12).map(normalizeHeaderName).filter(Boolean).join(", ") : "none";
      console.warn(`[googleSheetsServer] Could not find a valid member-name column in the current sheet headers. Available normalized keys: ${available}`);
      memberNameHeaderWarningShown = true;
    }
    return "";
  }

  const value = row?.[key] ?? "";
  return String(value).trim();
}

function escapeA1ColumnRange(sheetTitle: string) {
  return `'${escapeA1SheetName(sheetTitle)}'!A:Z`;
}

// Hardcoded spreadsheet IDs — update here if sheets are ever moved.
// OGV:      https://docs.google.com/spreadsheets/d/1gswBgo_6vrVpNcGpqqhDPidSbgMXUvaujkKmmSBzJUM
// OGTa/GTe: https://docs.google.com/spreadsheets/d/17_sbgCyBpF7KMIxlTNR0xL-hM-ydhPdreMAh9Y_nXRo
const HARDCODED_OGV_SPREADSHEET_ID = "1gswBgo_6vrVpNcGpqqhDPidSbgMXUvaujkKmmSBzJUM";
const HARDCODED_OGT_SPREADSHEET_ID = "17_sbgCyBpF7KMIxlTNR0xL-hM-ydhPdreMAh9Y_nXRo";

function getOpportunitySpreadsheetId(product: string) {
  const normalized = product.trim().toUpperCase();

  if (normalized === "GV" || normalized === "OGV") {
    const spreadsheetId = getOpportunityOgvSpreadsheetId() || HARDCODED_OGV_SPREADSHEET_ID;
    return { spreadsheetId, sheetType: "OGV" };
  }

  if (normalized === "GTA" || normalized === "GTE" || normalized === "OGTA" || normalized === "OGTE") {
    const spreadsheetId = getOpportunityOgtSpreadsheetId() || HARDCODED_OGT_SPREADSHEET_ID;
    return { spreadsheetId, sheetType: "OGT" };
  }

  throw new Error(`Unsupported opportunity product "${product}". Expected GV, GTa, or GTe.`);
}

function buildOpportunityValueMap(payload: OpportunitySubmissionPayload) {
  const submittedAt = payload.submittedAt ?? new Date().toISOString();
  const entries: Array<[string, string]> = [
    ["submittedat", submittedAt],
    ["timestamp", submittedAt],
    ["createdat", submittedAt],
    ["date", submittedAt],
    ["sheet", payload.sheetType],
    ["product", payload.product],
    ["opportunitytype", payload.product],
    ["opportunity", payload.opportunityTitle],
    ["opportunitytitle", payload.opportunityTitle],
    ["title", payload.opportunityTitle],
    ["opportunityid", payload.opportunityId],
    ["university", payload.universityName],
    ["universityname", payload.universityName],
    ["universityid", payload.universityId],
    ["country", payload.country],
    ["duration", payload.duration],
    ["opportunitydate", payload.opportunityDate],
    ["epname", payload.epName],
    ["ep", payload.epName],
    ["condition", payload.condition],
    ["epcondition", payload.condition],
    ["note", payload.note],
    ["remarks", payload.note],
    ["source", payload.source],
  ].filter((entry): entry is [string, string] => entry[1].trim().length > 0);

  return new Map<string, string>(entries);
}

function mapValuesToHeaders(headers: string[], valueMap: Map<string, string>) {
  return headers.map((header) => {
    const key = normalizeHeaderName(header);
    return valueMap.get(key) ?? "";
  });
}

function defaultOpportunityRow(payload: OpportunitySubmissionPayload) {
  const submittedAt = payload.submittedAt ?? new Date().toISOString();
  return [
    submittedAt,
    payload.sheetType,
    payload.product,
    payload.opportunityTitle,
    payload.opportunityId,
    payload.universityName,
    payload.universityId,
    payload.country,
    payload.duration,
    payload.opportunityDate,
    payload.epName,
    payload.condition,
    payload.note,
    payload.source,
  ].filter((value) => value.trim().length > 0);
}

export interface OpportunitySubmissionPayload {
  product: string;
  opportunityId: string;
  opportunityTitle: string;
  universityId: string;
  universityName: string;
  country: string;
  duration: string;
  opportunityDate: string;
  epName: string;
  condition: string;
  note: string;
  source: string;
  submittedAt?: string;
  sheetType: string;
}

export async function appendOpportunitySubmission(payload: Omit<OpportunitySubmissionPayload, "sheetType">) {
  const { spreadsheetId, sheetType } = getOpportunitySpreadsheetId(payload.product);
  const google = await getGoogleApis();
  const { auth } = getAuthClient(google);
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title,index))",
  });

  const sheetTitle = (meta.data.sheets ?? [])
    .map((sheet: any) => sheet?.properties?.title)
    .find((title: unknown): title is string => typeof title === "string" && title.length > 0);

  if (!sheetTitle) {
    throw new Error(`Google Sheets API could not find a worksheet to append to for ${sheetType}`);
  }

  const submittedAt = payload.submittedAt ?? new Date().toISOString();
  const rowPayload: OpportunitySubmissionPayload = { ...payload, submittedAt, sheetType };

  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: escapeA1ColumnRange(sheetTitle),
  });

  const headerRow = headerResponse.data.values?.[0] ?? [];
  const valueMap = buildOpportunityValueMap(rowPayload);
  const rowValues = headerRow.length > 0 ? mapValuesToHeaders(headerRow.map(String), valueMap) : defaultOpportunityRow(rowPayload);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: escapeA1ColumnRange(sheetTitle),
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [rowValues],
    },
  });

  return {
    spreadsheetIdSuffix: spreadsheetId.slice(-6),
    sheetTitle,
    sheetType,
    appendedAt: submittedAt,
  };
}

function getAuthClient(google: Awaited<ReturnType<typeof getGoogleApis>>) {
  const sheetId = getGoogleSheetId();
  const clientEmail = getGoogleSheetsClientEmail();
  const privateKey = getGoogleSheetsPrivateKey();

  const key = privateKey.replace(/\\n/g, "\n");

  return {
    sheetId,
    auth: new google.auth.JWT({
      email: clientEmail,
      key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }),
  };
}

function formatGoogleError(err: unknown): Error {
  const anyErr = err as any;
  const status = anyErr?.code ?? anyErr?.status ?? anyErr?.response?.status ?? "";
  const msg = anyErr?.message ?? String(err);
  const details: string[] = [];

  const errors = anyErr?.errors ?? anyErr?.response?.data?.error?.errors;
  if (Array.isArray(errors)) {
    for (const e of errors) {
      const parts = [
        e.domain ? `domain=${e.domain}` : "",
        e.reason ? `reason=${e.reason}` : "",
        e.location ? `location=${e.location}` : "",
        e.locationType ? `locationType=${e.locationType}` : "",
        e.message ? `msg=${e.message}` : "",
      ].filter(Boolean);
      if (parts.length) details.push("{" + parts.join(", ") + "}");
    }
  }

  const extra = details.length ? "\n  Google error details: " + details.join("; ") : "";
  const statusText = status ? `(${status}) ` : "";
  const out = new Error(`Google Sheets API ${statusText}${msg}${extra}`);
  (out as any).status = status;
  return out;
}

async function fetchSheetTab(tabName: string): Promise<Record<string, string>[]> {
  // Check if Google Sheets environment variables are set
  let sheetId: string;
  let clientEmail: string;
  let privateKey: string;

  try {
    sheetId = getGoogleSheetId();
    clientEmail = getGoogleSheetsClientEmail();
    privateKey = getGoogleSheetsPrivateKey();
  } catch {
    if (process.env.NODE_ENV === "production") {
      throw new Error('Google Sheets environment variables (GOOGLE_SHEET_ID, GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY) are required in production');
    }
    console.warn('[googleSheetsServer] Google Sheets environment variables not set, falling back to static JSON data (development only)');
    return fetchFromFallback(tabName);
  }

  const google = await getGoogleApis();
  const { sheetId: id, auth } = getAuthClient(google);
  const sheets = google.sheets({ version: "v4", auth });

  const requestedRange = `'${escapeA1SheetName(tabName)}'!A:Z`;

  let res: any;
  try {
    res = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: requestedRange,
    });
  } catch (err) {
    const anyErr = err as any;
    const message = String(anyErr?.message ?? err);

    if (message.includes("Unable to parse range")) {
      try {
        const availableTitles = await listSpreadsheetSheetTitles(sheets as any, id);
        const resolvedTabName = resolveSheetTitle(tabName, availableTitles);

        if (resolvedTabName !== tabName) {
          res = await sheets.spreadsheets.values.get({
            spreadsheetId: id,
            range: `'${escapeA1SheetName(resolvedTabName)}'!A:Z`,
          });
        } else {
          throw new Error(
            `Google Sheets API could not resolve tab "${tabName}". Available tabs: ${availableTitles.join(", ")}`,
          );
        }
      } catch (retryErr) {
        throw formatGoogleError(retryErr);
      }
    } else {
      throw formatGoogleError(err);
    }
  }

  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map(toCamelCase);

  return dataRows
    .filter((row: any[]) => row.some((cell: any) => cell !== "" && cell != null))
    .map((row: any[]) => {
      const obj: Record<string, string> = {};
      headers.forEach((key: string, i: number) => obj[key] = row[i] ?? "");
      return obj;
    });
}

async function fetchFromFallback(tabName: string): Promise<Record<string, string>[]> {
  try {
    if (tabName === "Digital Data") {
      const digitalData = await import("@/data/digitalConversionSignups.json");
      // Convert mixed data to Record<string, string> format
      return digitalData.default.map((item: any) => {
        const record: Record<string, string> = {};
        Object.keys(item).forEach(key => {
          const value = item[key];
          record[key] = value === undefined || value === null ? "" : String(value);
        });
        return record;
      });
    } else if (tabName === "Physical Data") {
      const physicalData = await import("@/data/physicalConversionSignups.json");
      // Convert mixed data to Record<string, string> format
      return physicalData.default.map((item: any) => {
        const record: Record<string, string> = {};
        Object.keys(item).forEach(key => {
          const value = item[key];
          record[key] = value === undefined || value === null ? "" : String(value);
        });
        return record;
      });
    }
    return [];
  } catch (err) {
    console.error(`[googleSheetsServer] Failed to load fallback data for ${tabName}:`, err);
    return [];
  }
}

export async function fetchDigitalLeadsRaw() {
  return fetchSheetTab("Digital Data");
}

export async function resolveRankingSheetTab(sheets: Awaited<ReturnType<Awaited<ReturnType<typeof getGoogleApis>>["sheets"]>>, spreadsheetId: string): Promise<string> {
  const availableTabs = await listSpreadsheetSheetTitles(sheets as any, spreadsheetId);
  const explicitTab = process.env.RANKING_SHEET_TAB?.trim();

  if (explicitTab) {
    const exactMatch = availableTabs.find((title) => title === explicitTab);
    if (exactMatch) return exactMatch;

    const normalizedMatch = availableTabs.find((title) => normalizeSheetTitle(title) === normalizeSheetTitle(explicitTab));
    if (normalizedMatch) return normalizedMatch;

    console.warn(`[googleSheetsServer] RANKING_SHEET_TAB="${explicitTab}" did not match any tab in the spreadsheet; auto-selecting the newest valid ranking tab.`);
  }

  const tabRows = await Promise.all(
    availableTabs.map(async (tabName) => {
      const rows = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${escapeA1SheetName(tabName)}'!A:Z`,
      });
      return { name: tabName, rows: rows.data.values ?? [] };
    }),
  );

  const selected = pickBestRankingSheetTab(tabRows);
  if (!selected) {
    throw new Error(`No valid ranking tab found. Available tabs: ${availableTabs.join(", ") || "none"}`);
  }

  console.warn(`[googleSheetsServer] Auto-selected ranking tab "${selected}" based on Submitted at + Member Name headers and latest dates.`);
  return selected;
}

export async function fetchPhysicalLeadsRaw() {
  const google = await getGoogleApis();
  const { sheetId: id, auth } = getAuthClient(google);
  const sheets = google.sheets({ version: "v4", auth });
  const tabName = await resolveRankingSheetTab(sheets as any, id);
  return fetchSheetTab(tabName);
}

export async function getGoogleSheetsDebugInfo() {
  let sheetId: string | undefined;
  let clientEmail: string | undefined;
  let privateKey: string | undefined;

  try {
    sheetId = getGoogleSheetId();
    clientEmail = getGoogleSheetsClientEmail();
    privateKey = getGoogleSheetsPrivateKey();
  } catch {
    // Variables not set
  }

  const base = {
    envVarsSet: {
      GOOGLE_SHEET_ID: !!sheetId,
      GOOGLE_SHEETS_CLIENT_EMAIL: !!clientEmail,
      GOOGLE_SHEETS_PRIVATE_KEY: !!privateKey,
    },
  };

  if (!sheetId || !clientEmail || !privateKey) {
    return {
      ...base,
      spreadsheetIdSuffix: sheetId ? sheetId.slice(-6) : null,
      availableTabs: null,
    };
  }

  const google = await getGoogleApis();
  const { sheetId: id, auth } = getAuthClient(google);
  const sheets = google.sheets({ version: "v4", auth });
  const availableTabs = await listSpreadsheetSheetTitles(sheets as any, id);

  return {
    ...base,
    spreadsheetIdSuffix: id.slice(-6),
    availableTabs,
  };
}

// ─── Opportunity persistence (cross-device store) ─────────────────────────────
//
// Uses a dedicated sheet tab called "Opportunities" in the OGV spreadsheet.
// Schema: column A = universityId (for filtering), column B = full JSON blob.
// Row 1 is a header: ["universityId", "data"]

const OPPORTUNITIES_SPREADSHEET_ID = "1gswBgo_6vrVpNcGpqqhDPidSbgMXUvaujkKmmSBzJUM";
const OPPORTUNITIES_TAB = "Opportunities";

async function getSheetsClient() {
  const google = await getGoogleApis();
  const { auth } = getAuthClient(google);
  return google.sheets({ version: "v4", auth });
}

async function ensureOpportunitiesTab(sheets: any) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: OPPORTUNITIES_SPREADSHEET_ID,
    fields: "sheets(properties(title))",
  });
  const titles: string[] = (meta.data.sheets ?? []).map(
    (s: any) => s?.properties?.title ?? ""
  );
  if (!titles.includes(OPPORTUNITIES_TAB)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: OPPORTUNITIES_SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: OPPORTUNITIES_TAB } } }],
      },
    });
    // Write header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: OPPORTUNITIES_SPREADSHEET_ID,
      range: `'${OPPORTUNITIES_TAB}'!A1:B1`,
      valueInputOption: "RAW",
      requestBody: { values: [["universityId", "data"]] },
    });
  }
}

export async function saveOpportunityToSheet(opportunity: import("@/lib/dataUtils").Opportunity) {
  const sheets = await getSheetsClient();
  await ensureOpportunitiesTab(sheets);

  // Check if a row for this opportunity id already exists → update it
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: OPPORTUNITIES_SPREADSHEET_ID,
    range: `'${OPPORTUNITIES_TAB}'!A:B`,
  });

  const rows: string[][] = existing.data.values ?? [];
  // rows[0] is the header; data starts at index 1
  let targetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    try {
      const parsed = JSON.parse(rows[i][1] ?? "{}");
      if (parsed.id === opportunity.id) {
        targetRowIndex = i + 1; // 1-indexed sheet row
        break;
      }
    } catch {
      // malformed row — skip
    }
  }

  const rowValues = [[opportunity.universityId, JSON.stringify(opportunity)]];

  if (targetRowIndex > 0) {
    // Update existing row
    await sheets.spreadsheets.values.update({
      spreadsheetId: OPPORTUNITIES_SPREADSHEET_ID,
      range: `'${OPPORTUNITIES_TAB}'!A${targetRowIndex}:B${targetRowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: rowValues },
    });
  } else {
    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: OPPORTUNITIES_SPREADSHEET_ID,
      range: `'${OPPORTUNITIES_TAB}'!A:B`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rowValues },
    });
  }
}

export async function loadOpportunitiesFromSheet(
  universityId?: string
): Promise<import("@/lib/dataUtils").Opportunity[]> {
  const sheets = await getSheetsClient();
  await ensureOpportunitiesTab(sheets);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: OPPORTUNITIES_SPREADSHEET_ID,
    range: `'${OPPORTUNITIES_TAB}'!A:B`,
  });

  const rows: string[][] = response.data.values ?? [];
  const results: import("@/lib/dataUtils").Opportunity[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const [rowUniversityId, jsonBlob] = rows[i] ?? [];
    if (!jsonBlob) continue;
    if (universityId && rowUniversityId !== universityId) continue;
    try {
      const opp = JSON.parse(jsonBlob) as import("@/lib/dataUtils").Opportunity;
      results.push(opp);
    } catch {
      // malformed — skip
    }
  }

  return results;
}

export async function deleteOpportunityFromSheet(opportunityId: string) {
  const sheets = await getSheetsClient();
  await ensureOpportunitiesTab(sheets);

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: OPPORTUNITIES_SPREADSHEET_ID,
    range: `'${OPPORTUNITIES_TAB}'!A:B`,
  });

  const rows: string[][] = existing.data.values ?? [];
  for (let i = 1; i < rows.length; i++) {
    try {
      const parsed = JSON.parse(rows[i][1] ?? "{}");
      if (parsed.id === opportunityId) {
        // Clear the row content (leaves an empty row — harmless)
        await sheets.spreadsheets.values.clear({
          spreadsheetId: OPPORTUNITIES_SPREADSHEET_ID,
          range: `'${OPPORTUNITIES_TAB}'!A${i + 1}:B${i + 1}`,
        });
        break;
      }
    } catch {
      // skip
    }
  }
}

// ─── Scheduled Attractions persistence ─────────────────────────────────────────
const DEFAULT_ATTRACTIONS_SPREADSHEET_ID = "1gswBgo_6vrVpNcGpqqhDPidSbgMXUvaujkKmmSBzJUM";
const ATTRACTIONS_TAB = "Scheduled Attractions";

export function getAttractionsSpreadsheetId(): string {
  return process.env.ATTRACTIONS_SPREADSHEET_ID || DEFAULT_ATTRACTIONS_SPREADSHEET_ID;
}

export function getAttractionsSpreadsheetIdHint(): string {
  const value = getAttractionsSpreadsheetId();
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function getAttractionsSheetConfig() {
  return { spreadsheetId: getAttractionsSpreadsheetId(), tabName: ATTRACTIONS_TAB };
}

export function normalizeScheduledAttractionRecord(raw: any): any | null {
  if (!raw || typeof raw !== "object") return null;

  const flattened = { ...raw };
  const nested = raw.extendedProps && typeof raw.extendedProps === "object" ? raw.extendedProps : {};

  const id = String(raw.id ?? nested.id ?? "").trim();
  const title = String(raw.title ?? nested.title ?? raw.name ?? "").trim();
  const start = String(raw.start ?? raw.date ?? nested.start ?? "").trim();
  const end = raw.end ?? nested.end;
  const university = String(raw.university ?? nested.university ?? "").trim();
  const note = raw.notes ?? raw.note ?? nested.note ?? "";
  const goal = raw.goal ?? nested.goal ?? 0;
  const status = raw.status ?? "active";
  const universityLogo = raw.universityLogo ?? nested.universityLogo ?? "";

  if (!id || !title || !start || !university) return null;

  const normalized = {
    id,
    title,
    start,
    end: end ? String(end).trim() : undefined,
    university,
    goal: Number.isFinite(Number(goal)) ? Number(goal) : 0,
    notes: typeof note === "string" ? sanitizeString(note, 500) : String(note ?? ""),
    note: typeof note === "string" ? sanitizeString(note, 500) : String(note ?? ""),
    universityLogo: universityLogo ? sanitizeString(String(universityLogo), 200) : undefined,
    backgroundColor: raw.backgroundColor ?? "#465FFF",
    borderColor: raw.borderColor ?? "#465FFF",
    status,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    extendedProps: {
      university,
      universityLogo: universityLogo ? sanitizeString(String(universityLogo), 200) : undefined,
      note: typeof note === "string" ? sanitizeString(note, 500) : String(note ?? ""),
      goal: Number.isFinite(Number(goal)) ? Number(goal) : 0,
    },
  };

  return normalized;
}

export function sanitizeScheduledAttractionInput(raw: any): any | null {
  const normalized = normalizeScheduledAttractionRecord(raw);
  if (!normalized) return null;

  return {
    ...normalized,
    title: sanitizeString(normalized.title, 200),
    university: sanitizeString(normalized.university, 200),
    notes: sanitizeString(normalized.notes, 500),
    note: sanitizeString(normalized.note, 500),
    start: sanitizeString(normalized.start, 32),
    end: normalized.end ? sanitizeString(normalized.end, 32) : undefined,
    universityLogo: normalized.universityLogo ? sanitizeString(normalized.universityLogo, 200) : undefined,
    extendedProps: {
      ...normalized.extendedProps,
      university: sanitizeString(normalized.university, 200),
      note: sanitizeString(normalized.note, 500),
      universityLogo: normalized.universityLogo ? sanitizeString(normalized.universityLogo, 200) : undefined,
      goal: Number.isFinite(Number(normalized.goal)) ? Number(normalized.goal) : 0,
    },
  };
}

export function parseScheduledAttractionRow(rawRow: string | undefined): { ok: boolean; attraction?: any; reason?: string } {
  if (!rawRow) return { ok: false, reason: "empty JSON payload" };

  try {
    const parsed = JSON.parse(rawRow);
    const normalized = normalizeScheduledAttractionRecord(parsed);
    if (!normalized) {
      return { ok: false, reason: "missing required attraction fields" };
    }
    return { ok: true, attraction: normalized };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "invalid JSON" };
  }
}

export function isAttractionVisibleToMembers(attraction: any, now: Date = new Date()): { visible: boolean; reason?: string } {
  if (!attraction) return { visible: false, reason: "missing attraction" };
  if (attraction.status === "archived") return { visible: false, reason: "archived" };

  const rawDate = attraction.start ?? attraction.date ?? attraction.attractionDate;
  if (!rawDate) return { visible: false, reason: "missing attraction date" };

  const dateValue = String(rawDate).trim();
  if (!dateValue) return { visible: false, reason: "missing attraction date" };

  const parsedDate = parseSubmittedAt(dateValue);
  if (!parsedDate) return { visible: false, reason: "invalid attraction date" };

  const startOfDay = new Date(parsedDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(parsedDate);
  endOfDay.setHours(23, 59, 59, 999);
  const expiry = new Date(endOfDay);
  expiry.setDate(expiry.getDate() + 7);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (parsedDate > now) {
    return { visible: true, reason: "future attraction" };
  }

  if (now > expiry) {
    return { visible: false, reason: "date older than 7 days" };
  }

  return { visible: true, reason: "within 7-day visibility window" };
}

async function ensureAttractionsTab(sheets: any) {
  const spreadsheetId = getAttractionsSpreadsheetId();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title))",
  });
  const titles: string[] = (meta.data.sheets ?? []).map((s: any) => s?.properties?.title ?? "");
  if (!titles.includes(ATTRACTIONS_TAB)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: ATTRACTIONS_TAB } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${ATTRACTIONS_TAB}'!A1:F1`,
      valueInputOption: "RAW",
      requestBody: { values: [["id", "title", "start", "end", "university", "data"]] },
    });
  }
}

export function filterVisibleScheduledAttractions(items: any[], now: Date = new Date()): any[] {
  return items.filter((item) => {
    const normalized = normalizeScheduledAttractionRecord(item);
    if (!normalized || normalized.status === "archived") return false;
    return isAttractionVisibleToMembers(normalized, now).visible;
  });
}

export function findScheduledAttractionRowIndex(rows: string[][], id: string): number {
  const targetId = String(id ?? "").trim();
  if (!targetId) return -1;

  for (let i = 1; i < rows.length; i++) {
    const rowId = String(rows[i]?.[0] ?? "").trim();
    if (rowId === targetId) return i;

    const parsed = parseScheduledAttractionRow(rows[i]?.[5]);
    if (parsed.ok && parsed.attraction?.id === targetId) {
      return i;
    }
  }

  return -1;
}

export function hasScheduledAttractionRow(rows: string[][], id: string): boolean {
  return findScheduledAttractionRowIndex(rows, id) >= 0;
}

async function getScheduledAttractionRows(): Promise<string[][]> {
  const sheets = await getSheetsClient();
  await ensureAttractionsTab(sheets);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getAttractionsSpreadsheetId(),
    range: `'${ATTRACTIONS_TAB}'!A:F`,
  });
  return response.data.values ?? [];
}

async function verifyScheduledAttractionWrite(id: string, retries: number = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const rows = await getScheduledAttractionRows();
    if (hasScheduledAttractionRow(rows, id)) {
      return true;
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  return false;
}

export async function saveScheduledAttractionToSheet(attraction: any) {
  const normalized = sanitizeScheduledAttractionInput(attraction);
  if (!normalized) {
    throw new Error("Invalid scheduled attraction payload");
  }

  const sheets = await getSheetsClient();
  await ensureAttractionsTab(sheets);

  const existing = await getScheduledAttractionRows();
  const targetRowIndex = findScheduledAttractionRowIndex(existing, normalized.id);

  const rowValues = [[normalized.id, normalized.title, normalized.start, normalized.end ?? "", normalized.university, JSON.stringify(normalized)]];

  if (targetRowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getAttractionsSpreadsheetId(),
      range: `'${ATTRACTIONS_TAB}'!A${targetRowIndex + 1}:F${targetRowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: rowValues },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getAttractionsSpreadsheetId(),
      range: `'${ATTRACTIONS_TAB}'!A:F`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rowValues },
    });
  }

  const finalRows = await getScheduledAttractionRows();
  const verifiedRowIndex = findScheduledAttractionRowIndex(finalRows, normalized.id);
  if (verifiedRowIndex < 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getAttractionsSpreadsheetId(),
      range: `'${ATTRACTIONS_TAB}'!A:F`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rowValues },
    });
  }

  const wasVerified = await verifyScheduledAttractionWrite(normalized.id, 3);
  if (!wasVerified) {
    throw new Error("Scheduled attraction write could not be verified in the Google Sheet.");
  }
}

export async function loadScheduledAttractionsFromSheet(): Promise<any[]> {
  const rows = await getScheduledAttractionRows();
  const results: any[] = [];

  for (let i = 1; i < rows.length; i++) {
    const parsed = parseScheduledAttractionRow(rows[i]?.[5]);
    if (!parsed.ok || !parsed.attraction) continue;

    const attraction = parsed.attraction;
    if (attraction.status === "archived") continue;

    const visibility = isAttractionVisibleToMembers(attraction, new Date());
    if (visibility.visible) {
      results.push(attraction);
    }
  }

  return results;
}

export async function getScheduledAttractionsAuditRows() {
  const rows = await getScheduledAttractionRows();
  const entries: Array<{
    id: string;
    parsedOK: boolean;
    errorReason?: string;
    attractionDate?: string;
    universityId?: string;
    visibleToMembers: boolean;
    visibilityReason?: string;
  }> = [];

  for (let i = 1; i < rows.length; i++) {
    const jsonBlob = rows[i]?.[5];
    const parsed = parseScheduledAttractionRow(jsonBlob);
    if (!parsed.ok || !parsed.attraction) {
      entries.push({
        id: String(rows[i]?.[0] ?? ""),
        parsedOK: false,
        errorReason: parsed.reason ?? "invalid JSON",
        visibleToMembers: false,
        visibilityReason: "invalid JSON",
      });
      continue;
    }

    const attraction = parsed.attraction;
    const visibility = isAttractionVisibleToMembers(attraction, new Date());
    entries.push({
      id: attraction.id,
      parsedOK: true,
      attractionDate: attraction.start,
      universityId: attraction.university,
      visibleToMembers: visibility.visible,
      visibilityReason: visibility.reason,
    });
  }

  return entries;
}

export async function deleteScheduledAttractionFromSheet(id: string) {
  const sheets = await getSheetsClient();
  await ensureAttractionsTab(sheets);

  const rows = await getScheduledAttractionRows();
  const rowIndex = findScheduledAttractionRowIndex(rows, id);
  if (rowIndex >= 1) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: getAttractionsSpreadsheetId(),
      range: `'${ATTRACTIONS_TAB}'!A${rowIndex + 1}:F${rowIndex + 1}`,
    });
    return true;
  }

  return false;
}

export async function archiveScheduledAttractionById(id: string) {
  const sheets = await getSheetsClient();
  await ensureAttractionsTab(sheets);

  const rows = await getScheduledAttractionRows();
  const rowIndex = findScheduledAttractionRowIndex(rows, id);
  if (rowIndex < 1) return false;

  const parsed = parseScheduledAttractionRow(rows[rowIndex]?.[5]);
  const attraction = parsed.ok ? parsed.attraction : null;
  const next = attraction ? { ...attraction, status: "archived", updatedAt: new Date().toISOString() } : null;
  if (!next) return false;

  await sheets.spreadsheets.values.update({
    spreadsheetId: getAttractionsSpreadsheetId(),
    range: `'${ATTRACTIONS_TAB}'!A${rowIndex + 1}:F${rowIndex + 1}`,
    valueInputOption: "RAW",
    requestBody: { values: [[next.id, next.title, next.start, next.end ?? "", next.university, JSON.stringify(next)]] },
  });
  return true;
}
