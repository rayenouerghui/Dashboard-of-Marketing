"use client";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";
import type { AttractionLeadStats } from "@/app/api/attraction-leads/route";

function formatDate(iso: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso)); }
  catch { return iso; }
}

export default function RecentOrders({ stats, loading }: { stats: AttractionLeadStats; loading?: boolean }) {
  const leads = stats.recent;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Leads</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Loading…" : `Last ${leads.length} physical attraction leads`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-gray-400">Fetching from Google Sheets…</div>
      ) : leads.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-gray-400">No recent leads found.</div>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                {["Name", "University", "Email", "Submitted"].map((h) => (
                  <TableCell key={h} isHeader className="py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 text-start">
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {leads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                  <TableCell className="py-3">
                    <p className="font-medium text-gray-800 text-sm dark:text-white/90">{lead.fullName || "—"}</p>
                  </TableCell>
                  <TableCell className="py-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{lead.university || "—"}</p>
                  </TableCell>
                  <TableCell className="py-3">
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{lead.email}</p>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(lead.submittedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
