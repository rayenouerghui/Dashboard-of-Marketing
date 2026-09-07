// This file is server-side only. Do not import in client components.
//
// Resources management for member dashboard - persisted in Google Sheets
// Uses the same spreadsheet as opportunities (OGV) with a dedicated "Resources" tab

import "server-only";
import { getGoogleApis } from "./googleSheetsServer";

const RESOURCES_SPREADSHEET_ID = "1gswBgo_6vrVpNcGpqqhDPidSbgMXUvaujkKmmSBzJUM";
const RESOURCES_TAB = "Resources";

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: "pdf" | "link" | "image" | "text";
  url?: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

async function getSheetsClient() {
  const google = await getGoogleApis();
  const { auth } = getAuthClient(google);
  return google.sheets({ version: "v4", auth });
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

async function ensureResourcesTab(sheets: any) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: RESOURCES_SPREADSHEET_ID,
    fields: "sheets(properties(title))",
  });
  const titles: string[] = (meta.data.sheets ?? []).map(
    (s: any) => s?.properties?.title ?? ""
  );
  if (!titles.includes(RESOURCES_TAB)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: RESOURCES_SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: RESOURCES_TAB } } }],
      },
    });
    // Write header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: RESOURCES_SPREADSHEET_ID,
      range: `'${RESOURCES_TAB}'!A1:H1`,
      valueInputOption: "RAW",
      requestBody: { 
        values: [["id", "title", "description", "type", "url", "content", "createdAt", "updatedAt"]] 
      },
    });
  }
}

export async function saveResourceToSheet(resource: Resource) {
  const sheets = await getSheetsClient();
  await ensureResourcesTab(sheets);

  // Check if a row for this resource id already exists → update it
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: RESOURCES_SPREADSHEET_ID,
    range: `'${RESOURCES_TAB}'!A:H`,
  });

  const rows: string[][] = existing.data.values ?? [];
  let targetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === resource.id) {
      targetRowIndex = i + 1; // 1-indexed sheet row
      break;
    }
  }

  const rowValues = [[
    resource.id,
    resource.title,
    resource.description,
    resource.type,
    resource.url || "",
    resource.content || "",
    resource.createdAt,
    resource.updatedAt,
  ]];

  if (targetRowIndex > 0) {
    // Update existing row
    await sheets.spreadsheets.values.update({
      spreadsheetId: RESOURCES_SPREADSHEET_ID,
      range: `'${RESOURCES_TAB}'!A${targetRowIndex}:H${targetRowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: rowValues },
    });
  } else {
    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: RESOURCES_SPREADSHEET_ID,
      range: `'${RESOURCES_TAB}'!A:H`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rowValues },
    });
  }
}

export async function loadResourcesFromSheet(): Promise<Resource[]> {
  const sheets = await getSheetsClient();
  await ensureResourcesTab(sheets);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: RESOURCES_SPREADSHEET_ID,
    range: `'${RESOURCES_TAB}'!A:H`,
  });

  const rows: string[][] = response.data.values ?? [];
  const results: Resource[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const [id, title, description, type, url, content, createdAt, updatedAt] = rows[i] ?? [];
    if (!id) continue;
    try {
      results.push({
        id,
        title: title || "",
        description: description || "",
        type: (type as Resource["type"]) || "text",
        url: url || undefined,
        content: content || undefined,
        createdAt: createdAt || new Date().toISOString(),
        updatedAt: updatedAt || new Date().toISOString(),
      });
    } catch {
      // malformed — skip
    }
  }

  return results;
}

export async function deleteResourceFromSheet(resourceId: string) {
  const sheets = await getSheetsClient();
  await ensureResourcesTab(sheets);

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: RESOURCES_SPREADSHEET_ID,
    range: `'${RESOURCES_TAB}'!A:H`,
  });

  const rows: string[][] = existing.data.values ?? [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === resourceId) {
      // Clear the row content
      await sheets.spreadsheets.values.clear({
        spreadsheetId: RESOURCES_SPREADSHEET_ID,
        range: `'${RESOURCES_TAB}'!A${i + 1}:H${i + 1}`,
      });
      break;
    }
  }
}
