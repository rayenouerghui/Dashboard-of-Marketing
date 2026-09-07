"use client";

import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PhysicalAttractionLead } from "@/lib/dataUtils";
import PageTransition from "@/components/PageTransition";

interface TodayAttraction {
  university: string;
  location?: string;
  type: "lead" | "scheduled";
}

export default function MemberDashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, hydrated } = useAuth();
  const router = useRouter();
  const { isExpanded, isHovered, isMobileOpen, toggleMobileSidebar } = useSidebar();
  const [showPopup, setShowPopup]             = useState(false);
  const [todayAttractions, setTodayAttractions] = useState<TodayAttraction[]>([]);
  const [hasShownPopup, setHasShownPopup]     = useState(false);

  // Redirect non-members away — wait for hydration so role is known
  useEffect(() => {
    if (!hydrated) return;
    if (role === "admin") {
      router.replace("/dashboard");
    }
  }, [role, hydrated, router]);

  // Today's attractions popup
  useEffect(() => {
    if (hasShownPopup || role !== "member") return;

    const check = async () => {
      const today = new Date().toISOString().slice(0, 10);
      try {
        const res = await fetch("/api/leads/physical");
        const leads: PhysicalAttractionLead[] = await res.json();
        const todayLeads = leads.filter(
          (l) => new Date(l.submittedAt).toISOString().slice(0, 10) === today
        );

        const saved = localStorage.getItem("customCalendarEvents");
        const customEvents = saved ? JSON.parse(saved) : [];
        const todayCustom = customEvents.filter((e: any) => e.start === today);

        const attractions: TodayAttraction[] = [
          ...todayLeads.map((l) => ({ university: l.university, type: "lead" as const })),
          ...todayCustom.map((e: any) => ({
            university: e.extendedProps.university,
            location:   e.extendedProps.note,
            type:       "scheduled" as const,
          })),
        ];

        if (attractions.length > 0) {
          setTodayAttractions(attractions);
          setHasShownPopup(true);
          setTimeout(() => setShowPopup(true), 1500);
        }
      } catch {
        // non-fatal
      }
    };

    check();
  }, [hasShownPopup, role]);

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  // Block render until role is confirmed — prevents flash of member content for non-members
  if (!hydrated || role === "admin") {
    return null;
  }

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 dark:bg-gray-900 dark:border-gray-800">
          <h1 className="text-sm font-semibold text-gray-800 dark:text-white">Menu</h1>
          <button
            onClick={toggleMobileSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div className="p-4 mx-auto max-w-[--breakpoint-2xl] md:p-6">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>

      {/* Today's Attractions Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-white via-blue-50 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4 duration-500 border border-blue-100 dark:border-gray-700">
            {/* Animated header with celebration */}
            <div className="relative mb-6">
              <div className="absolute -top-2 -left-2 w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full blur-2xl opacity-20 animate-pulse" />
              <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full blur-xl opacity-30 animate-pulse delay-100" />
              
              <div className="relative flex items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 animate-bounce">
                    <span className="text-3xl">🎉</span>
                  </div>
                  <div className="absolute -top-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <span className="text-xs font-bold text-white">{todayAttractions.length}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-300">
                    Today's Attractions
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {todayAttractions.length} attraction{todayAttractions.length > 1 ? "s" : ""} scheduled
                  </p>
                </div>
              </div>
            </div>

            {/* Attractions list with staggered animation */}
            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
              {todayAttractions.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800 border border-gray-100 dark:border-gray-600 hover:shadow-md transition-all duration-300 animate-in slide-in-from-left-2"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="relative">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      a.type === "scheduled"
                        ? "bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/20"
                        : "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20"
                    }`}>
                      <span className="text-lg">{a.type === "scheduled" ? "📅" : "🎯"}</span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{a.university}</p>
                    {a.location && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs">📍</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.location}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Link
                href="/member-dashboard/timeline"
                onClick={() => setShowPopup(false)}
                className="flex-1 group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3.5 text-sm font-semibold text-white hover:from-brand-600 hover:to-brand-700 transition-all duration-300 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5"
              >
                View Timeline
                <svg className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <button
                onClick={() => setShowPopup(false)}
                className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-3.5 text-sm font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 hover:-translate-y-0.5"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
