import fs from "fs";

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

for (const f of process.argv.slice(2)) {
  const rows = parseCSV(fs.readFileSync(f, "utf8"));
  const headers = rows[0];
  const approvedIdx = headers.indexOf("Approved?");
  const memberIdx = headers.findIndex((h) => h.includes("Member Name"));
  const referralIdx = headers.findIndex((h) => h.includes("Referral"));
  const vals = {};
  rows.slice(1).forEach((r) => {
    const v = r[approvedIdx] || "";
    vals[v] = (vals[v] || 0) + 1;
  });
  console.log("\n===", f, "===");
  console.log("rows:", rows.length - 1);
  console.log("Approved values:", vals);
  const yes = rows.slice(1).filter((r) => r[approvedIdx] === "Yes");
  console.log("Yes count:", yes.length);
  const memberRank = {};
  yes.forEach((r) => {
    const m = r[memberIdx] || "(empty)";
    memberRank[m] = (memberRank[m] || 0) + 1;
  });
  const refRank = {};
  yes.forEach((r) => {
    const ref = r[referralIdx] || "(empty)";
    refRank[ref] = (refRank[ref] || 0) + 1;
  });
  console.log("Member rankings (physical):", Object.entries(memberRank).sort((a,b)=>b[1]-a[1]).slice(0,10));
  console.log("Referral rankings (digital):", Object.entries(refRank).sort((a,b)=>b[1]-a[1]).slice(0,10));
}
