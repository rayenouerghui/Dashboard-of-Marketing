"use client";
import React, { useState, useMemo } from "react";
import { getDigitalLeads, getPhysicalAttractionLeads } from "@/lib/dataUtils";
import { Lead, PhysicalAttractionLead } from "@/lib/dataUtils";

type SortOption = "leads" | "percentage" | "name";
type SortDirection = "asc" | "desc";

interface RankingItem {
  name: string;
  leads: number;
  percentage: number;
}

export default function RankingPage() {
  const digitalLeads = getDigitalLeads();
  const physicalLeads = getPhysicalAttractionLeads();
  
  const [universitySort, setUniversitySort] = useState<SortOption>("leads");
  const [universitySortDir, setUniversitySortDir] = useState<SortDirection>("desc");
  const [fieldSort, setFieldSort] = useState<SortOption>("leads");
  const [fieldSortDir, setFieldSortDir] = useState<SortDirection>("desc");
  const [memberSort, setMemberSort] = useState<SortOption>("leads");
  const [memberSortDir, setMemberSortDir] = useState<SortDirection>("desc");

  const totalLeads = digitalLeads.length + physicalLeads.length;

  // University Rankings
  const universityRankings = useMemo(() => {
    const map: Record<string, number> = {};
    
    digitalLeads.forEach(lead => {
      const name = lead.university || 'Unknown';
      map[name] = (map[name] || 0) + 1;
    });
    
    physicalLeads.forEach(lead => {
      const name = lead.university || 'Unknown';
      map[name] = (map[name] || 0) + 1;
    });

    return Object.entries(map).map(([name, leads]) => ({
      name,
      leads,
      percentage: totalLeads > 0 ? (leads / totalLeads) * 100 : 0
    }));
  }, [digitalLeads, physicalLeads, totalLeads]);

  // Field Rankings
  const fieldRankings = useMemo(() => {
    const map: Record<string, number> = {};
    
    digitalLeads.forEach(lead => {
      const field = lead.internshipType || 'Unknown';
      map[field] = (map[field] || 0) + 1;
    });
    
    physicalLeads.forEach(lead => {
      const field = lead.fieldOfStudy || lead.internshipType || 'Unknown';
      map[field] = (map[field] || 0) + 1;
    });

    return Object.entries(map).map(([name, leads]) => ({
      name,
      leads,
      percentage: totalLeads > 0 ? (leads / totalLeads) * 100 : 0
    }));
  }, [digitalLeads, physicalLeads, totalLeads]);

  // Responsible Member Rankings
  const memberRankings = useMemo(() => {
    const map: Record<string, number> = {};
    
    physicalLeads.forEach(lead => {
      const member = lead.memberName || lead.referral || 'Unknown';
      if (member && member.trim() !== '') {
        map[member] = (map[member] || 0) + 1;
      }
    });

    return Object.entries(map).map(([name, leads]) => ({
      name,
      leads,
      percentage: totalLeads > 0 ? (leads / totalLeads) * 100 : 0
    }));
  }, [physicalLeads, totalLeads]);

  const sortRankings = (rankings: RankingItem[], sortBy: SortOption, direction: SortDirection) => {
    return [...rankings].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "leads") {
        comparison = a.leads - b.leads;
      } else if (sortBy === "percentage") {
        comparison = a.percentage - b.percentage;
      } else {
        comparison = a.name.localeCompare(b.name);
      }
      return direction === "asc" ? comparison : -comparison;
    });
  };

  const RankingTable = ({ 
    title, 
    rankings, 
    sortBy, 
    sortDir, 
    onSortChange, 
    onSortDirChange 
  }: { 
    title: string; 
    rankings: RankingItem[]; 
    sortBy: SortOption; 
    sortDir: SortDirection; 
    onSortChange: (val: SortOption) => void; 
    onSortDirChange: (val: SortDirection) => void; 
  }) => {
    const sortedRankings = sortRankings(rankings, sortBy, sortDir);

    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="leads">Sort by Leads</option>
              <option value="percentage">Sort by %</option>
              <option value="name">Sort by Name</option>
            </select>
            <button
              onClick={() => onSortDirChange(sortDir === "asc" ? "desc" : "asc")}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="pb-3 text-left text-sm font-semibold text-gray-800 dark:text-white/90">Rank</th>
                <th className="pb-3 text-left text-sm font-semibold text-gray-800 dark:text-white/90">Name</th>
                <th className="pb-3 text-right text-sm font-semibold text-gray-800 dark:text-white/90">Leads</th>
                <th className="pb-3 text-right text-sm font-semibold text-gray-800 dark:text-white/90">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedRankings.map((item, index) => (
                <tr key={item.name} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                      index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</td>
                  <td className="py-3 text-right text-sm text-gray-600 dark:text-gray-400">{item.leads}</td>
                  <td className="py-3 text-right text-sm text-gray-600 dark:text-gray-400">{item.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Ranking Attraction
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Performance rankings by universities, fields, and responsible members
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Leads</p>
          <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{totalLeads}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Universities</p>
          <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{universityRankings.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Fields</p>
          <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{fieldRankings.length}</p>
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingTable
          title="Universities"
          rankings={universityRankings}
          sortBy={universitySort}
          sortDir={universitySortDir}
          onSortChange={setUniversitySort}
          onSortDirChange={setUniversitySortDir}
        />
        <RankingTable
          title="Fields of Study"
          rankings={fieldRankings}
          sortBy={fieldSort}
          sortDir={fieldSortDir}
          onSortChange={setFieldSort}
          onSortDirChange={setFieldSortDir}
        />
      </div>

      <RankingTable
        title="Responsible Members"
        rankings={memberRankings}
        sortBy={memberSort}
        sortDir={memberSortDir}
        onSortChange={setMemberSort}
        onSortDirChange={setMemberSortDir}
      />
    </div>
  );
}
