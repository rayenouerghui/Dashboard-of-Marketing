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

function toCamelCase(header: string): string {
  // Preserve emojis and special characters, only convert spaces to camelCase
  // This keeps column names like "🌍 Type Of Abroad Internship (Volunteering Internship)" intact
  return header.trim();
}

async function getGoogleApis() {
  const mod = await import("googleapis");
  return mod.google;
}

function escapeA1SheetName(tabName: string) {
  return tabName.replace(/'/g, "''");
}

function normalizeSheetTitle(tabName: string) {
  return tabName.trim().toLowerCase();
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

function normalizeHeaderName(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
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
    const spreadsheetId =
      process.env.OPPORTUNITY_OGV_SPREADSHEET_ID || HARDCODED_OGV_SPREADSHEET_ID;
    return { spreadsheetId, sheetType: "OGV" };
  }

  if (normalized === "GTA" || normalized === "GTE" || normalized === "OGTA" || normalized === "OGTE") {
    const spreadsheetId =
      process.env.OPPORTUNITY_OGT_SPREADSHEET_ID || HARDCODED_OGT_SPREADSHEET_ID;
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
    valueInputOption: "USER_ENTERED",
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
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!sheetId) {
    throw new Error('GOOGLE_SHEET_ID environment variable is not set');
  }
  if (!clientEmail || !privateKey) {
    throw new Error('GOOGLE_SHEETS_CLIENT_EMAIL or GOOGLE_SHEETS_PRIVATE_KEY environment variable is not set');
  }

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
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  // If env vars are not set, fall back to static JSON files
  if (!sheetId || !clientEmail || !privateKey) {
    console.warn('[googleSheetsServer] Google Sheets environment variables not set, falling back to static JSON data');
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

export async function fetchPhysicalLeadsRaw() {
  return fetchSheetTab("Physical Data");
}

export async function getGoogleSheetsDebugInfo() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

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
