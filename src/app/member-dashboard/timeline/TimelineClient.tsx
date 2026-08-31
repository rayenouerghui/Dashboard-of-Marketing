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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/member-dashboard"
            className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:text-brand-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Member Dashboard
          </Link>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
            Member Timeline
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Weekly attraction schedule and submitted leads (Monday &ndash; Friday)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <CalendarDays className="h-3.5 w-3.5" />
            {weekScheduledCount} attraction{weekScheduledCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {weekLeadTotal} lead{weekLeadTotal === 1 ? "" : "s"} this week
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 hidden md:block"></div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-5 relative">
          {weekDays.map((day, idx) => {
            const totalGoal = day.scheduled.reduce(
              (s, ev) => s + (typeof ev.extendedProps.goal === "number" ? ev.extendedProps.goal : 0),
              0
            );
            const progress =
              totalGoal > 0 ? Math.min(100, Math.round((day.leads.length / totalGoal) * 100)) : null;

            return (
              <div key={day.dayStr} className="relative">
                <div
                  className={`hidden md:flex absolute top-7 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 z-10 ${
                    day.isToday
                      ? "bg-emerald-500 border-emerald-500"
                      : day.isPast
                      ? "bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600"
                      : "bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600"
                  }`}
                ></div>

                <div
                  className={`mt-12 rounded-xl border p-4 transition-all shadow-sm sm:p-5 ${
                    day.isToday
                      ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-900/20 shadow-md"
                      : day.isPast
                      ? "border-gray-200 bg-gray-50 opacity-80 dark:border-gray-700 dark:bg-gray-800/50"
                      : "border-gray-200 bg-white dark:border-gray-700 dark:bg-white/[0.03]"
                  }`}
                >
                  <div className="mb-4 text-center">
                    <p
                      className={`text-lg font-bold ${
                        day.isToday
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-gray-800 dark:text-white"
                      }`}
                    >
                      {day.dayName}
                    </p>
                    <p
                      className={`text-sm ${
                        day.isToday
                          ? "text-emerald-600 dark:text-emerald-500"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                    {day.isToday && (
                      <span className="mt-2 inline-block rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                        Today
                      </span>
                    )}
                    {totalGoal > 0 && (
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          <span>
                            {day.leads.length} / {totalGoal} leads
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (progress ?? 0) >= 100
                                ? "bg-emerald-500"
                                : (progress ?? 0) >= 50
                                ? "bg-brand-500"
                                : "bg-amber-400"
                            }`}
                            style={{ width: `${progress ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {day.scheduled.length === 0 && day.leads.length === 0 ? (
                      <EmptyState title="Nothing scheduled" />
                    ) : (
                      <>
                        {day.scheduled.map((ev, evIdx) => (
                          <div
                            key={ev.id || `sch-${evIdx}`}
                            className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-800/60 dark:text-blue-200">
                                <MapPin className="h-2.5 w-2.5" />
                                Scheduled
                              </span>
                              {typeof ev.extendedProps.goal === "number" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                                  <Target className="h-2.5 w-2.5" />
                                  Goal {ev.extendedProps.goal}
                                </span>
                              )}
                            </div>
                            <div className="flex items-start gap-2.5">
                              <LogoOrInitials
                                src={ev.extendedProps.universityLogo}
                                name={ev.extendedProps.university}
                                size={34}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                                  {getShortUniversityName(ev.extendedProps.university)}
                                </p>
                                {ev.extendedProps.note && (
                                  <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
                                    {ev.extendedProps.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {day.leads.length > 0 && (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 dark:border-emerald-800 dark:bg-emerald-900/15">
                            <div className="mb-2 flex items-center justify-between px-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                Submitted leads
                              </span>
                              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                {day.leads.length}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {day.leads.map((lead, li) => {
                                const leadKey =
                                  lead.submissionId || lead.expaId || `lead-${day.dayStr}-${li}`;
                                const fullName = [lead.firstName, lead.lastName]
                                  .filter(Boolean)
                                  .join(" ") || "Unnamed Lead";
                                return (
                                  <div
                                    key={leadKey}
                                    className="rounded-md border border-white bg-white px-2.5 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800/80"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                        {fullName.substring(0, 2).toUpperCase()}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-semibold text-gray-800 dark:text-white/90">
                                          {fullName}
                                        </p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                                          <span className="inline-flex items-center gap-0.5">
                                            <Building2 className="h-2.5 w-2.5" />
                                            {getShortUniversityName(lead.university)}
                                          </span>
                                          {lead.memberName && (
                                            <span className="inline-flex items-center gap-0.5">
                                              <UserCircle className="h-2.5 w-2.5" />
                                              {lead.memberName.length > 18
                                                ? lead.memberName.substring(0, 18) + "..."
                                                : lead.memberName}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-2 text-sm">
        <Legend color="bg-emerald-500" label="Today" />
        <Legend color="bg-gray-300 dark:bg-gray-600" label="Past" />
        <Legend
          color="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
          label="Upcoming"
        />
        <Legend color="bg-blue-500" label="Scheduled attraction" />
        <Legend color="bg-emerald-400" label="Submitted leads" />
      </div>
    </div>
  );
}
