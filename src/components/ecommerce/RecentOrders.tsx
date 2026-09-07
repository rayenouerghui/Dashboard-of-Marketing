"use client";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";
import type { ExpaLeadStats } from "@/app/api/expa/leads/route";

const STATUS_COLOR: Record<string, "success" | "primary" | "warning" | "error" | "light"> = {
  completed:           "success",
  finished:            "success",
  realized:            "success",
  matched:             "primary",
  approved:            "primary",
  approved_ep_manager: "primary",
  accepted:            "primary",
  open:                "warning",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed", finished: "Finished", realized: "Realized",
  matched: "Matched", approved: "Approved", approved_ep_manager: "Approved",
  accepted: "Accepted", open: "Applied",
};

const PROG_COLOR: Record<string, string> = {
  GTa: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  GTe: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  GV:  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

function formatDate(iso: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso)); }
  catch { return iso; }
}

export default function RecentOrders({ stats, loading }: { stats: ExpaLeadStats; loading?: boolean }) {
  const leads = stats.recent;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Sign-Ups</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Loading…" : `Last ${leads.length} people from EXPA`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-gray-400">Fetching from EXPA…</div>
      ) : leads.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-gray-400">No recent sign-ups found.</div>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                {["Name", "Programme", "Status", "Signed Up"].map((h) => (
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
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{lead.email}</p>
                  </TableCell>
                  <TableCell className="py-3">
                    {lead.programme ? (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PROG_COLOR[lead.programme] ?? "bg-gray-100 text-gray-600"}`}>
                        {lead.programme}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    {lead.bestStatus ? (
                      <Badge size="sm" color={STATUS_COLOR[lead.bestStatus] ?? "light"}>
                        {STATUS_LABEL[lead.bestStatus] ?? lead.bestStatus}
                      </Badge>
                    ) : (
                      <Badge size="sm" color="light">No App</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(lead.createdAt)}
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
