"use client";
import React from "react";

export const dynamic = 'force-dynamic';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import Badge from "@/components/ui/badge/Badge";
import { getUniversityStats } from "@/lib/dataUtils";
import { useState } from "react";

export default function UniversitiesPage() {
  const universityData = getUniversityStats();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUniversities = universityData.filter((uni: any) => {
    return uni.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalLeads = universityData.reduce((sum: number, uni: any) => sum + uni.totalLeads, 0);
  const totalSuccessful = universityData.reduce((sum: number, uni: any) => sum + uni.successfulAccounts, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Universities
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overview of universities and their lead statistics
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Universities</p>
          <p className="mt-1 text-xl font-bold text-gray-800 dark:text-white">{universityData.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Leads</p>
          <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">{totalLeads}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Accounts Created</p>
          <p className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">{totalSuccessful}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by university name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  University
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Total Leads
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Volunteering
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Professional
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Teaching
                </TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Success Rate
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredUniversities.map((uni: any, index: number) => {
                const successRate = uni.totalLeads > 0 
                  ? ((uni.successfulAccounts / uni.totalLeads) * 100).toFixed(1)
                  : "0";
                
                return (
                  <TableRow key={index}>
                    <TableCell className="py-3">
                      <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {uni.name}
                      </p>
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {uni.totalLeads}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {uni.volunteering}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {uni.professional}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {uni.teaching}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        size="sm"
                        color={parseFloat(successRate) > 70 ? "success" : parseFloat(successRate) > 40 ? "warning" : "error"}
                      >
                        {successRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
