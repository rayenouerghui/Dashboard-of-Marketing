/**
 * Convert "conversion rate .csv" (EXPA applications export) → applicationsPipeline.json
 * Run: node scripts/convert-applications-csv.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "../../../conversion rate .csv");
const OUT_PATH = path.join(__dirname, "../src/data/applicationsPipeline.json");

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === "," && !inQuotes) { row.push(cell.trim()); cell = ""; continue; }
    if ((c === "\n" || c === "\r") && !inQuotes) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (cell || row.length) { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
      continue;
    }
    cell += c;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

const rows = parseCSV(fs.readFileSync(CSV_PATH, "utf8"));
const [headers, ...dataRows] = rows;

// columns: Application ID, Status, Created At, EP ID, EP Name, Programme, Opportunity ID, Opportunity Title
const records = dataRows
  .filter((r) => r.length >= 6 && r[0])
  .map((r) => ({
    applicationId: r[0] ?? "",
    status: r[1] ?? "",
    createdAt: r[2] ?? "",
    epId: r[3] ?? "",
    epName: r[4] ?? "",
    programme: r[5] ?? "",
    opportunityId: r[6] ?? "",
    opportunityTitle: r[7] ?? "",
  }));

fs.writeFileSync(OUT_PATH, JSON.stringify(records, null, 2));
console.log(`✅  Wrote applicationsPipeline.json — ${records.length} records`);

// Print summary
const byStatus = {};
records.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
console.log("Status breakdown:", byStatus);
