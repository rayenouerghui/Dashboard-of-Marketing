"use client";

import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function MemberDashboardLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const router = useRouter();
  const { isExpanded, isHovered, isMobileOpen, toggleMobileSidebar } = useSidebar();

  useEffect(() => {
    if (role !== "member") {
      router.replace("/dashboard");
    }
  }, [role, router]);

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
    </div>
  );
}
