/**
 * submissionsStore.ts
 * Simple in-process store for opportunity fill submissions.
 * Data lives in memory — survives across requests in the same server process.
 * On Vercel, each serverless function instance has its own memory, so this
 * is best-effort (submissions from concurrent instances won't merge).
 * For a fully persistent solution, replace with a DB or a sheet-backed store.
 */

export type SubmissionRecord = {
  id: string;
  submittedAt: string;
  sheet: "OGV" | "OGT";
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
};

// Module-level map: sheet → submissions[]
const store: Map<"OGV" | "OGT", SubmissionRecord[]> = new Map([
  ["OGV", []],
  ["OGT", []],
]);

export function addSubmission(record: Omit<SubmissionRecord, "id" | "submittedAt">) {
  const entry: SubmissionRecord = {
    ...record,
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    submittedAt: new Date().toISOString(),
  };
  const list = store.get(entry.sheet) ?? [];
  list.unshift(entry); // newest first
  store.set(entry.sheet, list);
  return entry;
}

export function getSubmissions(sheet: "OGV" | "OGT"): SubmissionRecord[] {
  return store.get(sheet) ?? [];
}

export function getAllSubmissions(): SubmissionRecord[] {
  return [...(store.get("OGV") ?? []), ...(store.get("OGT") ?? [])].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

/** Derive which sheet a product belongs to */
export function productToSheet(product: string): "OGV" | "OGT" {
  const p = product.trim().toUpperCase();
  if (p === "GV" || p === "OGV") return "OGV";
  return "OGT";
}
