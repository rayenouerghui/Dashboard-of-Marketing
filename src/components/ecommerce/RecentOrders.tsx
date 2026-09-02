"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { Lead } from "@/lib/dataUtils";
import { useState, useMemo, useEffect } from "react";
import { ArrowUpIcon, ArrowDownIcon } from "@/icons";

interface RecentOrdersProps {
  initialStats: Awaited<ReturnType<typeof import('@/lib/dataUtilsServer').getDashboardStats>>;
}

type SortField = 'name' | 'university' | 'type' | 'status' | 'date';
type SortDirection = 'asc' | 'desc';

export default function RecentOrders({ initialStats }: RecentOrdersProps) {
  const recentLeads = initialStats.recentLeads as Lead[];
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLastRefresh(new Date());
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Sort function
  const sortedLeads = useMemo(() => {
    return [...recentLeads].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case 'university':
          comparison = a.university.localeCompare(b.university);
          break;
        case 'type':
          comparison = a.internshipType.localeCompare(b.internshipType);
          break;
        case 'status':
          comparison = a.accountStatus.localeCompare(b.accountStatus);
          break;
        case 'date':
          comparison = a.submittedAt.localeCompare(b.submittedAt);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [recentLeads, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Leads
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {recentLeads.length} leads • Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-theme-sm font-medium shadow-theme-xs transition-colors ${
              autoRefresh
                ? 'border-green-500 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/20 dark:text-green-400'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]'
            }`}
          >
            <span className={`w-4 h-4 border-2 border-current rounded-full ${autoRefresh ? 'border-t-transparent animate-spin' : ''}`} />
            Auto-refresh
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            View All
          </button>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                <div
                  className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors p-1 rounded"
                  onClick={() => handleSort('name')}
                >
                  Name
                  <SortIcon field="name" />
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                <div
                  className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors p-1 rounded"
                  onClick={() => handleSort('university')}
                >
                  University
                  <SortIcon field="university" />
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                <div
                  className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors p-1 rounded"
                  onClick={() => handleSort('type')}
                >
                  Type
                  <SortIcon field="type" />
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                <div
                  className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors p-1 rounded"
                  onClick={() => handleSort('date')}
                >
                  Date
                  <SortIcon field="date" />
                </div>
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                <div
                  className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors p-1 rounded"
                  onClick={() => handleSort('status')}
                >
                  Status
                  <SortIcon field="status" />
                </div>
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sortedLeads.map((lead) => (
              <TableRow key={lead.submissionId} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                <TableCell className="py-3">
                  <div>
                    <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                      {lead.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {lead.university}
                </TableCell>
                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {lead.internshipType}
                </TableCell>
                <TableCell className="py-3">
                  <div className="text-gray-500 text-theme-sm dark:text-gray-400">
                    <div>{formatDate(lead.submittedAt)}</div>
                    <div className="text-xs">{formatTime(lead.submittedAt)}</div>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  <Badge
                    size="sm"
                    color={lead.accountStatus.includes('✅') ? "success" : "warning"}
                  >
                    {lead.accountStatus.includes('✅') ? 'Account Created' : 'Account Exists'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
