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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-2xl">📍</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Today's Attractions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {todayAttractions.length} attraction{todayAttractions.length > 1 ? "s" : ""} today
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {todayAttractions.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <div className="h-8 w-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                    <span className="text-sm">{a.type === "scheduled" ? "📅" : "🎯"}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{a.university}</p>
                    {a.location && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.location}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Link
                href="/member-dashboard/timeline"
                onClick={() => setShowPopup(false)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                View Timeline
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <button
                onClick={() => setShowPopup(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
