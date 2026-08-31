"use client";

import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PhysicalAttractionLead } from "@/lib/dataUtils";

interface TodayAttraction {
  university: string;
  location?: string;
  type: "lead" | "scheduled";
}

export default function MemberDashboardLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const router = useRouter();
  const { isExpanded, isHovered, isMobileOpen, toggleMobileSidebar } = useSidebar();
  const [showPopup, setShowPopup] = useState(false);
  const [todayAttractions, setTodayAttractions] = useState<TodayAttraction[]>([]);
  const [hasShownPopup, setHasShownPopup] = useState(false);

  useEffect(() => {
    if (role !== "member") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  useEffect(() => {
    if (hasShownPopup) return;

    const checkTodayAttractions = async () => {
      const today = new Date().toISOString().slice(0, 10);
      
      try {
        // Fetch physical leads from API
        const response = await fetch('/api/leads/physical');
        const leads: PhysicalAttractionLead[] = await response.json();
        
        const todayLeads = leads.filter((lead) => {
          return new Date(lead.submittedAt).toISOString().slice(0, 10) === today;
        });

        // Check custom calendar events
        const saved = localStorage.getItem("customCalendarEvents");
        const customEvents = saved ? JSON.parse(saved) : [];
        const todayCustomEvents = customEvents.filter((event: any) => event.start === today);

        const attractions: TodayAttraction[] = [];

        // Add physical leads
        todayLeads.forEach((lead) => {
          attractions.push({
            university: lead.university,
            type: "lead",
          });
        });

        // Add custom events
        todayCustomEvents.forEach((event: any) => {
          attractions.push({
            university: event.extendedProps.university,
            location: event.extendedProps.note,
            type: "scheduled",
          });
        });

        if (attractions.length > 0) {
          setTodayAttractions(attractions);
          setHasShownPopup(true);
          // Show popup after 1.5 seconds
          setTimeout(() => setShowPopup(true), 1500);
        }
      } catch (error) {
        console.error("Failed to fetch leads for popup:", error);
      }
    };

    checkTodayAttractions();
  }, [hasShownPopup]);

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        {/* Mobile Tab Toggle Header */}
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
        <div className="p-4 mx-auto max-w-[--breakpoint-2xl] md:p-6">{children}</div>
      </div>

      {/* Today's Attractions Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-2xl">📍</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  Today's Attractions
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {todayAttractions.length} attraction{todayAttractions.length > 1 ? 's' : ''} scheduled today
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {todayAttractions.map((attraction, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="h-8 w-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                      {attraction.type === "scheduled" ? "📅" : "🎯"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                      {attraction.university}
                    </p>
                    {attraction.location && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {attraction.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Link
                href="/member-dashboard/timeline"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                onClick={() => setShowPopup(false)}
              >
                View Timeline
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <button
                onClick={() => setShowPopup(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
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
