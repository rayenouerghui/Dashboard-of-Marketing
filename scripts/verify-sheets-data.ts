import fs from "node:fs";
import path from "node:path";
import { fetchDigitalLeadsRaw, fetchPhysicalLeadsRaw } from "../src/lib/googleSheetsServer";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim().replace(/^export\s+/, "");
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, "\n");
    process.env[key] = value;
  }

  return true;
}

function pct(n: number, total: number) {
  return total === 0 ? "0%" : `${((n / total) * 100).toFixed(1)}%`;
}

function nonEmpty(rows: Record<string, string>[], key: string) {
  return rows.filter((row) => (row[key] ?? "").toString().trim() !== "").length;
}

function reportEnv() {
  const keys = ["GOOGLE_SHEET_ID", "GOOGLE_SHEETS_CLIENT_EMAIL", "GOOGLE_SHEETS_PRIVATE_KEY"];
  for (const key of keys) {
    console.log(`${key} set:`, Boolean(process.env[key]));
  }
}

async function reportTab(title: string, rows: Record<string, string>[], metrics: Array<[string, string]>) {
  console.log(`\n=== ${title} ===`);
  console.log("Row count:", rows.length);

  if (rows.length === 0) {
    console.log("!! ZERO ROWS RETURNED !!");
    return;
  }

  console.log("Raw keys on first row:", Object.keys(rows[0]));
  for (const [label, key] of metrics) {
    const filled = nonEmpty(rows, key);
    console.log(`${label} filled:`, filled, "/", rows.length, pct(filled, rows.length));
  }
  console.log("Sample row 0:", rows[0]);
}

async function main() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const loaded = loadEnvFile(envPath);

  console.log("=== ENV CHECK ===");
  console.log("Loaded .env.local:", loaded);
  reportEnv();
  console.log("(if any of these are false, you are on fallback JSON, not live data)\n");

  console.log("=== FETCHING DIGITAL ('Digital Attraction' tab) ===");
  const digital = await fetchDigitalLeadsRaw();
  await reportTab("DIGITAL", digital, [
    ["First Name", "[FN] First Name"],
    ["Last Name", "[LN] Last Name"],
    ["Phone", "[PN] Phone Number"],
    ["Submitted at", "Submitted at"],
    ["Internship type", "🌍 Type Of Abroad Internship"],
  ]);

  console.log("\n=== FETCHING PHYSICAL ('Physical Data' tab) ===");
  const physical = await fetchPhysicalLeadsRaw();
  await reportTab("PHYSICAL", physical, [
    ["First Name", "[FN] First Name"],
    ["Last Name", "[LN] Last Name"],
    ["Phone", "[PN] Phone Number"],
    ["Submitted at", "Submitted at"],
    ["Internship type", "🌍 Type Of Abroad Internship"],
  ]);

  console.log("\n=== EXPECTATIONS (from the sheet export shared earlier) ===");
  console.log("Physical: ~3098 total rows, ~1922 with internship type filled");
  console.log("Digital: ~316 total rows (not 232 — that's the stale fallback count)");
}

main().catch((err) => {
  console.error("\n!! FETCH THREW AN ERROR — this is likely why one tab returns 0 rows !!");
  console.error(err);
  process.exit(1);
});