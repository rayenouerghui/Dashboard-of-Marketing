import fs from "node:fs";
import path from "node:path";

const envFiles = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
];

for (const envPath of envFiles) {
  if (!fs.existsSync(envPath)) continue;

  const text = fs.readFileSync(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex < 0) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, "\n");
    if (!(key in process.env)) process.env[key] = value;
  }
}

const required = [
  "GOOGLE_SHEET_ID",
  "GOOGLE_SHEETS_CLIENT_EMAIL",
  "GOOGLE_SHEETS_PRIVATE_KEY",
];

const ready = required.every((key) => Boolean(process.env[key]));
console.log("Google Sheets env configured:", ready);
console.log("Spreadsheet ID present:", Boolean(process.env.GOOGLE_SHEET_ID));
console.log("Client email present:", Boolean(process.env.GOOGLE_SHEETS_CLIENT_EMAIL));
console.log("Private key present:", Boolean(process.env.GOOGLE_SHEETS_PRIVATE_KEY));

if (!ready) {
  console.warn("No live sheet inspection was possible because the Google Sheets credentials are not available in this environment.");
  const fallbackPath = path.resolve(process.cwd(), "src/data/physicalConversionSignups.json");
  const rows = JSON.parse(fs.readFileSync(fallbackPath, "utf8"));
  const headers = Object.keys(rows[0] ?? {});
  console.log("\nFallback mode: local JSON dataset");
  console.log("Header count:", headers.length);
  headers.forEach((header, index) => {
    console.log(`Index ${index}: ${header}`);
  });

  const countsByColumn = headers.map(() => new Map());
  for (const row of rows) {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = String(row[header] ?? "").trim();
      if (!value) continue;
      if (/email|phone|mobile|tel|contact/.test(header.toLowerCase())) continue;
      const map = countsByColumn[i];
      map.set(value, (map.get(value) ?? 0) + 1);
    }
  }

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (/email|phone|mobile|tel|contact/.test(header.toLowerCase())) continue;
    const top = [...countsByColumn[i].entries()]
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
      .slice(0, 10);
    console.log(`\nColumn ${i}: ${header}`);
    if (top.length === 0) {
      console.log("  no distinct values");
      continue;
    }
    top.forEach(([value, count], rank) => {
      console.log(`  ${rank + 1}. ${value} -> ${count}`);
    });
  }
  process.exit(0);
}

const spreadsheetId = process.env.GOOGLE_SHEET_ID;
const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n");

const { google } = await import("googleapis");
const auth = new google.auth.JWT({
  email: clientEmail,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });
const meta = await sheets.spreadsheets.get({
  spreadsheetId,
  fields: "sheets(properties(title,hidden))",
});

const tabTitles = (meta.data.sheets ?? []).map((sheet) => sheet?.properties?.title).filter(Boolean);
console.log("Spreadsheet suffix:", spreadsheetId.slice(-6));
console.log("Tabs:", tabTitles);

const targetTabs = tabTitles.filter((title) => /physical|digital/i.test(title));
for (const tab of targetTabs) {
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tab}'!A1:Z1`,
  });
  const headers = headerRes.data.values?.[0] ?? [];

  console.log(`\nTab: ${tab}`);
  console.log("Header count:", headers.length);
  headers.forEach((header, index) => {
    console.log(`Index ${index}: ${header}`);
  });

  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tab}'!A2:Z1000`,
  });
  const rows = dataRes.data.values ?? [];

  const valueCountsByColumn = headers.map((_, index) => new Map());
  for (const row of rows) {
    for (let i = 0; i < headers.length; i++) {
      const rawValue = row[i]?.toString().trim() ?? "";
      if (!rawValue) continue;
      const header = String(headers[i]).toLowerCase();
      const isPii = /email|phone|mobile|tel|contact/.test(header);
      if (isPii) continue;
      const m = valueCountsByColumn[i];
      m.set(rawValue, (m.get(rawValue) ?? 0) + 1);
    }
  }

  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]);
    const normalizedHeader = header.toLowerCase();
    const isPii = /email|phone|mobile|tel|contact/.test(normalizedHeader);
    if (isPii) continue;

    const counts = [...valueCountsByColumn[i].entries()]
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
      .slice(0, 10);

    console.log(`\nColumn ${i}: ${header}`);
    if (counts.length === 0) {
      console.log("  no distinct values");
      continue;
    }

    counts.forEach(([value, count], rank) => {
      console.log(`  ${rank + 1}. ${value} -> ${count}`);
    });
  }
}
