"use client";
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

import Badge from "../ui/badge/Badge";
import { Lead } from "@/lib/dataUtils";
import { useState, useMemo } from "react";
import { ArrowUpIcon, ArrowDownIcon } from "@/icons";
import Pagination from "./Pagination";

interface BasicTableOneProps {
  initialLeads: Lead[];
}

type SortField = 'name' | 'email' | 'phone' | 'university' | 'type' | 'status' | 'date';
type SortDirection = 'asc' | 'desc';

export default function BasicTableOne({ initialLeads }: BasicTableOneProps) {
  const allLeads = initialLeads;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredLeads = useMemo(() => {
    return allLeads.filter((lead: Lead) => {
      const matchesSearch =
        lead.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "created" && lead.accountStatus.includes('✅')) ||
        (filterStatus === "existing" && lead.accountStatus.includes('⚠️'));

      return matchesSearch && matchesStatus;
    });
  }, [allLeads, searchTerm, filterStatus]);

  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'phone':
          comparison = a.phone.localeCompare(b.phone);
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
  }, [filteredLeads, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);
  const paginatedLeads = sortedLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />;
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by name, email, phone, or university..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="all">All Status</option>
          <option value="created">Account Created</option>
          <option value="existing">Account Exists</option>
        </select>
      </div>

      {/* Results count */}
      <div className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Showing {paginatedLeads.length} of {sortedLeads.length} leads
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1102px]">
            <Table>
              {/* Table Header */}
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
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
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    <div
                      className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors p-1 rounded"
                      onClick={() => handleSort('email')}
                    >
                      Email
                      <SortIcon field="email" />
                    </div>
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    <div
                      className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors p-1 rounded"
                      onClick={() => handleSort('phone')}
                    >
                      Phone
                      <SortIcon field="phone" />
                    </div>
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
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
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
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
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
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
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
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
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paginatedLeads.map((lead) => (
                  <TableRow key={lead.submissionId} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {lead.firstName} {lead.lastName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {lead.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {lead.email}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {lead.phone}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {lead.university}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {lead.internshipType}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {formatDate(lead.submittedAt)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
