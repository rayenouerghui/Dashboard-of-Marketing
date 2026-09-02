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
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
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

  let res: any;
  try {
    res = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: `${tabName}!A:Z`,
    });
  } catch (err) {
    throw formatGoogleError(err);
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
    if (tabName === "Digital Attraction") {
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
  return fetchSheetTab("Digital Attraction");
}

export async function fetchPhysicalLeadsRaw() {
  return fetchSheetTab("Physical Data");
}
