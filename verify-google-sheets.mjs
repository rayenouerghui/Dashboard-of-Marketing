// Standalone verifier — run OUTSIDE Next to split "code bug" vs "Google-side bug".
//
//   node verify-google-sheets.mjs
//
// Does EXACTLY what googleSheetsServer.ts does:
//   1. reads the SAME .env.local vars (GOOGLE_SHEETS_*, GOOGLE_SHEET_ID)
//   2. builds the same JWT with the same private_key.replace(/\\n/g, "\n")
//   3. calls google.sheets({ v4 }).spreadsheets.values.get on the same ranges
//
// If this script prints 403 / forbidden → it's 100% a Google-side issue
// (sheet not shared, Workspace external sharing policy, or service account
// disabled in GCP IAM).  If it prints rows → the Next.js app will also work
// once Next's in-memory unstable_cache expires / server is restarted.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

// Load .env.local the same way Next does (@next/env + dotenv conventions)
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    let key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // dotenv rule: double-quoted value → expand \n → LF, strip outer quotes
    if (val.length >= 2 && val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    if (val.length >= 2 && val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const PRIVATE_KEY_RAW = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

console.log("GOOGLE_SHEET_ID          :", JSON.stringify(SHEET_ID));
console.log("GOOGLE_SHEETS_CLIENT_EMAIL:", JSON.stringify(CLIENT_EMAIL));
console.log("PRIVATE_KEY length       :", PRIVATE_KEY_RAW ? PRIVATE_KEY_RAW.length : "undefined");

if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY_RAW) {
  console.error("\n❌ .env.local missing one or more of GOOGLE_SHEET_ID / GOOGLE_SHEETS_CLIENT_EMAIL / GOOGLE_SHEETS_PRIVATE_KEY");
  process.exit(1);
}

// Exactly the same normalisation the app uses (unescape literal \n in .env value)
const PRIVATE_KEY = PRIVATE_KEY_RAW.replace(/\\n/g, "\n");
console.log("Private key starts with  :", JSON.stringify(PRIVATE_KEY.slice(0, 40)));
console.log("Private key ends with    :", JSON.stringify(PRIVATE_KEY.slice(-30)));

const { google } = await import("googleapis");

const auth = new google.auth.JWT({
  email: CLIENT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

async function probe(tab) {
  console.log(`\n⏳ GET spreadsheets.values.get  range="${tab}!A:Z" …`);
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A:Z`,
    });
    const rows = res.data.values ?? [];
    console.log(`✅  tab="${tab}"  rows=${rows.length}  colsPerFirstRow=${rows[0]?.length ?? 0}`);
    if (rows.length) {
      console.log("   header:", JSON.stringify(rows[0].slice(0, 6)));
      if (rows.length > 1) console.log("   row 1 :", JSON.stringify(rows[1].slice(0, 6)));
    }
    return true;
  } catch (err) {
    const any = err;
    const status = any?.code ?? any?.response?.status ?? "?";
    const message = any?.message ?? String(err);
    const errors = any?.errors ?? any?.response?.data?.error?.errors ?? [];
    const detail = Array.isArray(errors)
      ? errors.map(e => `{${[
          e.domain && `domain=${e.domain}`,
          e.reason && `reason=${e.reason}`,
          e.message && `msg=${e.message}`,
        ].filter(Boolean).join(", ")}}`).join("; ")
      : "";
    console.error(`❌  tab="${tab}" → ${status} ${message}`);
    if (detail) console.error("   Google details:", detail);
    // Extra diagnostic — "forbidden" almost always = share the sheet with CLIENT_EMAIL.
    if (/forbidden|caller does not have permission/i.test(message) || errors?.some(e => String(e.reason).toLowerCase() === "forbidden")) {
      console.error(`\n👉 FIX: open https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit → Share → paste exactly: ${CLIENT_EMAIL} → role Viewer → uncheck Notify people → Share.`);
      console.error(`   If you already shared and it still 403s: your Google Workspace admin likely blocks sharing with @*.iam.gserviceaccount.com ("external users").  Ask them to allowlist the project OR disable "Only allow sharing within the organization" temporarily.`);
    }
    return false;
  }
}

const okDigital = await probe("Digital Data");
const okPhysical = await probe("Physical Data");
console.log(`\nSummary: Digital=${okDigital ? "OK ✅" : "FAIL ❌"}  Physical=${okPhysical ? "OK ✅" : "FAIL ❌"}`);
process.exit(okDigital && okPhysical ? 0 : 2);
