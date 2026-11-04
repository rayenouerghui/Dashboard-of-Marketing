import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function loadDotEnv() {
  const candidates = [
    path.join(projectRoot, ".env.local"),
    path.join(projectRoot, ".env"),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value.replace(/^['"]|['"]$/g, "");
      }
    }
  }
}

function parseGoogleDate(raw) {
  if (!raw || !String(raw).trim()) return null;
  const value = String(raw).trim();
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    const ms = (Number(value) - 25569) * 86400000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const iso = value.replace(/\s+/, "T");
  const date = new Date(iso);
  if (!Number.isNaN(date.getTime())) return date;

  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const [, a, b, year] = slash;
    const day = Number(a) > 12 && Number(b) <= 12 ? Number(a) : Number(b);
    const month = Number(a) > 12 && Number(b) <= 12 ? Number(b) : Number(a);
    const iso2 = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00`;
    const parsed = new Date(iso2);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function formatDateHint(date) {
  return date ? date.toISOString().slice(0, 10) : "N/A";
}

function maskId(id) {
  if (!id) return "N/A";
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

function normalizeHeaderName(header) {
  return String(header ?? "")
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase()
    .trim();
}

function getMissingEnvVars() {
  const required = [
    "GOOGLE_SHEET_ID",
    "GOOGLE_SHEETS_CLIENT_EMAIL",
    "GOOGLE_SHEETS_PRIVATE_KEY",
  ];

  return required.filter((key) => !process.env[key] || !String(process.env[key]).trim());
}

async function listTabs(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title,gridProperties))",
  });

  return (meta.data.sheets ?? []).map((sheet) => ({
    name: sheet?.properties?.title,
    gridRowCount: sheet?.properties?.gridProperties?.rowCount ?? 0,
  }));
}

async function readTab(sheets, spreadsheetId, tabName) {
  const range = `'${tabName.replace(/'/g, "''")}'!A:Z`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = res.data.values ?? [];
  const headerRow = rows[0] ?? [];
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  const normalizedHeaders = headerRow.map((header) => normalizeHeaderName(header));

  const submittedIndex = headerRow.findIndex((header) => normalizeHeaderName(header).includes("submittedat"));

  let earliest = null;
  let latest = null;
  let rowsSinceCutoff = 0;
  const exampleDates = [];

  for (const row of dataRows) {
    const rawSubmitted = submittedIndex >= 0 ? row[submittedIndex] : "";
    const parsed = parseGoogleDate(rawSubmitted);
    if (!parsed) continue;
    if (!earliest || parsed.getTime() < earliest.getTime()) earliest = parsed;
    if (!latest || parsed.getTime() > latest.getTime()) latest = parsed;
    const day = parsed.toISOString().slice(0, 10);
    if (day >= "2026-09-01") rowsSinceCutoff++;
    if (exampleDates.length < 3) {
      exampleDates.push({ raw: String(rawSubmitted ?? ""), parsed: day });
    }
  }

  const hasBusinessAi = normalizedHeaders.some((header) => header.includes("business") && header.includes("ai"));

  return {
    tabName,
    headers: headerRow,
    dataRows: dataRows.length,
    earliest,
    latest,
    rowsSinceCutoff,
    hasBusinessAi,
    exampleDates,
    rowCount: rows.length,
  };
}

function printGoogleError(err) {
  const status = err?.code ?? err?.status ?? err?.response?.status ?? "unknown";
  const message = err?.message ?? String(err);
  console.error(`Google API failed with HTTP status ${status}: ${message}`);
  console.error("This usually means the service account is not shared to the sheet as Viewer or the spreadsheet ID / tab name is wrong.");
  process.exit(1);
}

async function main() {
  loadDotEnv();
  const missing = getMissingEnvVars();

  if (missing.length > 0) {
    console.error("Missing required env vars:");
    for (const key of missing) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = String(process.env.GOOGLE_SHEETS_PRIVATE_KEY).replace(/\\n/g, "\n");

  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "properties(title),sheets(properties(title,gridProperties))",
    });

    const spreadsheetTitle = meta.data.properties?.title ?? "unknown";
    console.log(`spreadsheet title: ${spreadsheetTitle}`);
    console.log(`spreadsheet id hint: ${maskId(spreadsheetId)}`);

    const tabs = await listTabs(sheets, spreadsheetId);
    for (const tab of tabs) {
      console.log(`- tab: ${tab.name} | grid rows: ${tab.gridRowCount}`);
    }

    for (const tab of tabs) {
      const info = await readTab(sheets, spreadsheetId, tab.name);
      console.log(`\nTAB: ${tab.name}`);
      console.log(`headers: ${info.headers.join(" | ")}`);
      console.log(`data rows: ${info.dataRows}`);
      console.log(`earliest Submitted at: ${info.earliest ? info.earliest.toISOString() : "N/A"}`);
      console.log(`latest Submitted at: ${info.latest ? info.latest.toISOString() : "N/A"}`);
      console.log(`rows on or after 2026-09-01: ${info.rowsSinceCutoff}`);
      console.log(`has Business & AI header: ${info.hasBusinessAi ? "yes" : "no"}`);
      console.log(`sample Submitted at values: ${info.exampleDates.map(({ raw, parsed }) => `${raw} => ${parsed}`).join("; ") || "none"}`);
    }
  } catch (err) {
    printGoogleError(err);
  }
}

main();
