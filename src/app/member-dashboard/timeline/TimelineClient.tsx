"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { PhysicalAttractionLead } from "@/lib/dataUtilsServer";

const STORAGE_KEY = "customCalendarEvents";

const ArrowLeft = ({ className }: { className?: string } = {}) => "\u2190";
const MapPin = ({ className }: { className?: string } = {}) => "\u{1F4CD}";
const Target = ({ className }: { className?: string } = {}) => "\u{1F3AF}";
const CalendarDays = ({ className }: { className?: string } = {}) => "\u{1F4C6}";
const UserCircle = ({ className }: { className?: string } = {}) => "\u{1F464}";
const Building2 = ({ className }: { className?: string } = {}) => "\u{1F3E2}";
const CheckCircle2 = ({ className }: { className?: string } = {}) => "\u2705";

interface ScheduledEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    university: string;
    universityLogo?: string;
    note?: string;
    goal?: number;
  };
}

interface DayBucket {
  date: Date;
  dayName: string;
  dayStr: string;
  scheduled: ScheduledEvent[];
  leads: PhysicalAttractionLead[];
  isToday: boolean;
  isPast: boolean;
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseSubmittedDayStr(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return toLocalDateString(d);
}

function getShortUniversityName(name: string): string {
  if (!name) return "Unknown";
  if (name.includes(":")) return name.split(":")[0].trim();
  return name.length > 25 ? name.substring(0, 25) + "..." : name;
}

function getUniversityLogo(university: string): string {
  const map: Record<string, string> = {
    "FMT: Facult\u00e9 de M\u00e9decine de Tunis": "/images/logo/fmt.png",
    "IPT: Institut Pr\u00e9paratoire aux \u00c9tudes d'Ing\u00e9nieurs de Tunis": "/images/logo/ipt.png",
    "ENIT: \u00c9cole Nationale d'Ing\u00e9nieurs de Tunis": "/images/logo/enit.png",
    "FST: Facult\u00e9 des Sciences de Tunis": "/images/logo/fst.png",
    "ISG: Institut Sup\u00e9rieur de Gestion": "/images/logo/isg.png",
  };
  const short = university.split(":")[0]?.trim() || university;
  return map[university] || map[short] || "/images/logo/default-university.png";
}

function LogoOrInitials({
  src,
  name,
  size = 40,
}: {
  src?: string;
  name: string;
  size?: number;
}) {
  const alt = name || "University";
  const actualSrc = src || getUniversityLogo(name);
  return (
    <div
      style={{ width: size, height: size }}
      className="relative shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
    >
      <Image
        src={actualSrc}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-contain p-1"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent && !parent.querySelector(".initials-fallback")) {
            const span = document.createElement("div");
            span.className =
              "initials-fallback flex h-full w-full items-center justify-center text-[11px] font-bold text-gray-500 dark:text-gray-300";
            span.textContent = (name || "??").substring(0, 2).toUpperCase();
            parent.appendChild(span);
          }
        }}
      />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-3 w-3 rounded-full ${color}`} />
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-6 text-center dark:border-gray-700">
      <CalendarDays className="mb-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      {hint && (
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </div>
  );
}

interface TimelineClientProps {
  initialLeads: PhysicalAttractionLead[];
}

export default function TimelineClient({ initialLeads }: TimelineClientProps) {
  const [mounted, setMounted] = useState(false);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [forceTick, setForceTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    loadScheduled();
  }, []);

  useEffect(() => {
    const handleSync = () => {
      loadScheduled();
      setForceTick((t) => t + 1);
    };
    window.addEventListener("storage", handleSync);
    window.addEventListener("attractionUpdated", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("attractionUpdated", handleSync);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const events = saved ? (JSON.parse(saved) as ScheduledEvent[]) : [];
        if (events.length !== scheduledEvents.length) {
          setScheduledEvents(events);
          setForceTick((t) => t + 1);
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(t);
  }, [scheduledEvents.length]);

  function loadScheduled() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setScheduledEvents(saved ? (JSON.parse(saved) as ScheduledEvent[]) : []);
    } catch {
      setScheduledEvents([]);
    }
  }

  const weekDays = useMemo<DayBucket[]>(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    const diff = currentDay - 1;
    if (diff < 0) monday.setDate(today.getDate() - (6 - currentDay));
    else monday.setDate(today.getDate() - diff);
    monday.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = toLocalDateString(today);

    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const buckets: DayBucket[] = [];

    for (let i = 0; i < 5; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      dayDate.setHours(0, 0, 0, 0);
      const dayStr = toLocalDateString(dayDate);

      const scheduled = scheduledEvents.filter((e) => e.start === dayStr);
      const leads = initialLeads.filter((lead) => {
        const d = parseSubmittedDayStr(lead.submittedAt);
        return d === dayStr;
      });

      buckets.push({
        date: dayDate,
        dayName: dayNames[i],
        dayStr,
        scheduled,
        leads,
        isToday: dayStr === todayStr,
        isPast: dayDate < todayStart,
      });
    }

    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLeads, scheduledEvents, forceTick, mounted]);

  const weekLeadTotal = weekDays.reduce((sum, d) => sum + d.leads.length, 0);
  const weekScheduledCount = weekDays.reduce((sum, d) => sum + d.scheduled.length, 0);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/member-dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:text-brand-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          THIS WEEK ATTRACTIONS
        </h1>
      </div>

      <div className="space-y-0">
        {scheduledEvents.length === 0 ? (
          <EmptyState title="No attractions scheduled this week" />
        ) : (
          scheduledEvents.map((ev, idx) => {
            const eventDate = new Date(ev.start);
            const dayName = eventDate.toLocaleDateString("en-US", { weekday: "long" });
            const formattedDate = eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            
            return (
              <div key={ev.id || `event-${idx}`}>
                <div className="flex items-center gap-4 bg-blue-500 rounded-2xl p-4">
                  <LogoOrInitials
                    src={ev.extendedProps.universityLogo}
                    name={ev.extendedProps.university}
                    size={48}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-base truncate">
                      {getShortUniversityName(ev.extendedProps.university)}
                    </p>
                    {ev.extendedProps.note && (
                      <p className="text-blue-100 text-sm truncate mt-0.5">
                        {ev.extendedProps.note}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">{dayName}</p>
                    <p className="text-blue-100 text-sm">{formattedDate}</p>
                  </div>
                </div>
                {idx < scheduledEvents.length - 1 && (
                  <div className="h-px bg-gray-300 border-t border-dashed border-gray-400 my-3"></div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
