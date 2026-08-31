/**
 * One-off script: convert conversion-rate CSV exports to JSON for static data phase.
 * Run: node scripts/convert-conversion-csv.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/data");

const SOURCES = [
  {
    csv: "C:/Users/rayen/Desktop/dashbord/conversion rate  - Physical Attraction Signups (1).csv",
    json: "physicalConversionSignups.json",
    type: "physical",
  },
  {
    csv: "C:/Users/rayen/Desktop/dashbord/conversion rate  - National OGX Signups (1).csv",
    json: "digitalConversionSignups.json",
    type: "digital",
  },
];

function parseCSV(text) {
  const rows = [];
  let row = [],
    cell = "",
    inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if ((c === "\n" || c === "\r") && !inQuotes) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (cell || row.length) {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = "";
      }
      continue;
    }
    cell += c;
  }
  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

function col(headers, ...needles) {
  return headers.findIndex((h) => needles.every((n) => h.includes(n)));
}

function toRecord(headers, values, type) {
  const idx = {
    expaId: 0,
    submissionId: 1,
    submittedAt: 3,
    firstName: col(headers, "[FN]"),
    lastName: col(headers, "[LN]"),
    email: col(headers, "[E]"),
    university: col(headers, "[UN]"),
    referral: col(headers, "Referral"),
    memberName: col(headers, "Member Name"),
    applied: headers.indexOf("Applied?"),
    approved: headers.indexOf("Approved?"),
  };

  const base = {
    expaId: values[idx.expaId] ?? "",
    submissionId: values[idx.submissionId] ?? "",
    submittedAt: values[idx.submittedAt] ?? "",
    firstName: values[idx.firstName] ?? "",
    lastName: values[idx.lastName] ?? "",
    email: values[idx.email] ?? "",
    university: values[idx.university] ?? "",
    applied: values[idx.applied] ?? "No",
    approved: values[idx.approved] ?? "",
  };

  if (type === "physical") {
    return { ...base, memberName: values[idx.memberName] ?? "", referral: values[idx.referral] ?? "" };
  }
  return { ...base, referral: values[idx.referral] ?? "" };
}

for (const { csv, json, type } of SOURCES) {
  const rows = parseCSV(fs.readFileSync(csv, "utf8"));
  const headers = rows[0];
  const records = rows.slice(1).filter((r) => r.length > 1).map((r) => toRecord(headers, r, type));
  fs.writeFileSync(path.join(outDir, json), JSON.stringify(records, null, 2));
  console.log(`Wrote ${json}: ${records.length} records`);
}
