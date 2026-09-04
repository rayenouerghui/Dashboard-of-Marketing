"use client";

import Link from "next/link";
import type { PhysicalAttractionLead } from "@/lib/dataUtils";
import { useEffect, useMemo, useState } from "react";

const ANIMAL_AVATARS = ["🦊", "🐼", "🦁", "🐨", "🐯", "🐰", "🦉", "🐺", "🐸", "🐻"];

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STORAGE_KEY = "customCalendarEvents";
const DEFAULT_GOAL = 30;
const TOP_MEMBERS_LIMIT = 6;

interface CustomEvent {
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

/** Return ALL events scheduled for today (supports multiple per day). */
function readTodaysAttractions(): CustomEvent[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const events: CustomEvent[] = saved ? JSON.parse(saved) : [];
    const todayStr = toLocalDateString(new Date());
    return events.filter((e) => e.start === todayStr);
  } catch {
    return [];
  }
}

/**
 * Fuzzy university match: both sides are lowercased and we check if one
 * contains the other (or vice-versa). This handles cases where the lead's
 * university string is slightly different from the calendar event title.
 */
function universityMatches(leadUniversity: string, eventUniversity: string): boolean {
  if (!leadUniversity || !eventUniversity) return false;
  const a = leadUniversity.trim().toLowerCase();
  const b = eventUniversity.trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

export default function MemberDashboardClient({
  initialLeads = [],
}: {
  initialLeads?: PhysicalAttractionLead[];
}) {
  const leads = initialLeads; // physical leads only (server-fetched)
  const [mounted, setMounted] = useState(false);
  const [todaysAttractions, setTodaysAttractions] = useState<CustomEvent[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const handleSync = () => {
      const next = readTodaysAttractions();
      setTodaysAttractions(next);
      // Keep active tab in range if attractions change
      setActiveTab((prev) => (prev < next.length ? prev : 0));
    };

    handleSync();
    window.addEventListener("storage", handleSync);
    window.addEventListener("attractionUpdated", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("attractionUpdated", handleSync);
    };
  }, []);

  const today = toLocalDateString(new Date());

  // All physical leads from today across all universities
  const todayAllLeads = useMemo(
    () => leads.filter((l) => toLocalDateString(new Date(l.submittedAt)) === today),
    [leads, today]
  );

  // Per-attraction computed data
  const attractionData = useMemo(() => {
    return todaysAttractions.map((attraction) => {
      const uniName = attraction.extendedProps.university;

      // Filter today's physical leads to only this university
      const uniLeads = todayAllLeads.filter((l) =>
        universityMatches(l.university, uniName)
      );

      const dailyGoal = attraction.extendedProps.goal ?? DEFAULT_GOAL;
      const leadCount = uniLeads.length;
      const goalPct = Math.min(100, Math.round((leadCount / dailyGoal) * 100));

      // Leaderboard — grouped by member
      const counts = new Map<string, number>();
      for (const lead of uniLeads) {
        const name = lead.memberName?.trim();
        if (!name) continue;
        counts.set(name, (counts.get(name) || 0) + 1);
      }
      const leaderboard = Array.from(counts.entries())
        .map(([name, leadsToday]) => ({ name, leadsToday }))
        .sort((a, b) => b.leadsToday - a.leadsToday)
        .slice(0, TOP_MEMBERS_LIMIT)
        .map((m, i) => ({ ...m, rank: i + 1 }));

      return { attraction, uniLeads, leadCount, dailyGoal, goalPct, leaderboard };
    });
  }, [todaysAttractions, todayAllLeads]);

  const hasAttractionToday = todaysAttractions.length > 0;
  const multipleAttractions = todaysAttractions.length > 1;
  const current = attractionData[activeTab];

  const avatarFor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % ANIMAL_AVATARS.length;
    return ANIMAL_AVATARS[hash];
  };

  const podiumHeights: Record<number, string> = {
    1: "h-20 sm:h-24",
    2: "h-14 sm:h-16",
    3: "h-10 sm:h-12",
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white/90">
          Member Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your daily progress and ranking overview.
        </p>
      </div>

      {!hasAttractionToday ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-white/[0.03] sm:p-10">
          <span className="text-4xl">🗓️</span>
          <h2 className="mt-1 text-base font-semibold text-gray-700 dark:text-gray-200 sm:text-lg">
            No Attraction Scheduled Today
          </h2>
          <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
            There&apos;s nothing on the calendar for today. Check back once an admin schedules an attraction,
            or take a look at the upcoming schedule on the Timeline.
          </p>
        </div>
      ) : (
        <>
          {/* Tab switcher — only shown when there are 2+ attractions */}
          {multipleAttractions && (
            <div className="flex gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              {todaysAttractions.map((attraction, i) => (
                <button
                  key={attraction.id}
                  onClick={() => setActiveTab(i)}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    activeTab === i
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="block truncate">
                    Attraction {i + 1}
                  </span>
                  <span className="block truncate text-xs opacity-75 mt-0.5">
                    {attraction.extendedProps.university}
                  </span>
                </button>
              ))}
            </div>
          )}

          {current && (
            <>
              {/* Progress overview */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Leads Today{multipleAttractions ? ` · Attraction ${activeTab + 1}` : ""}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-brand-500 tabular-nums">
                      {current.leadCount}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Goal</p>
                    <p className="mt-1 text-lg font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                      {current.dailyGoal}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-700 ease-out"
                    style={{ width: mounted ? `${current.goalPct}%` : "0%" }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {current.goalPct >= 100
                    ? "Daily goal reached 🎉"
                    : `${current.goalPct}% of today's goal · ${Math.max(0, current.dailyGoal - current.leadCount)} to go`}
                </p>
                <p className="mt-2 truncate text-xs font-medium text-gray-400 dark:text-gray-500">
                  📍 {current.attraction.extendedProps.university}
                </p>
              </div>

              {/* Daily leaderboard — podium style */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#171233] via-[#120e28] to-[#0d0a1e] p-4 sm:p-6 shadow-2xl">
                <div className="pointer-events-none absolute -top-16 -left-10 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-fuchsia-500/10 blur-3xl" />

                <div className="relative mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-white">Daily leaderboard</h2>
                    <p className="text-xs text-violet-200/50 mt-0.5">
                      {current.attraction.extendedProps.university} · physical leads
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur px-3 py-1.5 text-xs font-semibold text-violet-200">
                    <span>🏆</span>
                    <span className="tabular-nums">{current.leadCount}</span>
                  </div>
                </div>

                {current.leaderboard.length === 0 ? (
                  <div className="relative rounded-xl border border-dashed border-white/15 py-8 text-center">
                    <p className="text-sm text-violet-200/60">No leads brought in yet today — be the first!</p>
                  </div>
                ) : (
                  <>
                    {/* Top 3 */}
                    {(() => {
                      const first  = current.leaderboard.find((m) => m.rank === 1);
                      const second = current.leaderboard.find((m) => m.rank === 2);
                      const third  = current.leaderboard.find((m) => m.rank === 3);
                      const rest   = current.leaderboard.filter((m) => m.rank > 3);

                      return (
                        <>
                          {first && (
                            <div className="relative flex items-end justify-center gap-4 sm:gap-6 mb-3">
                              {second && (
                                <div className={`flex flex-col items-center transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ transitionDelay: "80ms" }}>
                                  <span className="text-lg mb-0.5">🥈</span>
                                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/[0.06] backdrop-blur border-2 border-slate-300/40 flex items-center justify-center text-2xl">
                                    {avatarFor(second.name)}
                                  </div>
                                  <p className="mt-1.5 max-w-[68px] truncate text-[11px] sm:text-xs font-medium text-white text-center">{second.name.split(" ")[0]}</p>
                                  <p className="text-[10px] sm:text-[11px] text-violet-200 font-semibold tabular-nums">{second.leadsToday}</p>
                                </div>
                              )}
                              <div className={`flex flex-col items-center transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
                                <span className="text-xl mb-0.5">👑</span>
                                <div className="h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 backdrop-blur border-2 border-violet-300/70 flex items-center justify-center text-3xl shadow-[0_0_24px_rgba(167,139,250,0.35)]">
                                  {avatarFor(first.name)}
                                </div>
                                <p className="mt-1.5 max-w-[80px] truncate text-xs sm:text-sm font-semibold text-white text-center">{first.name.split(" ")[0]}</p>
                                <p className="text-xs text-violet-200 font-bold tabular-nums">{first.leadsToday}</p>
                              </div>
                              {third && (
                                <div className={`flex flex-col items-center transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ transitionDelay: "80ms" }}>
                                  <span className="text-lg mb-0.5">🥉</span>
                                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/[0.06] backdrop-blur border-2 border-amber-300/40 flex items-center justify-center text-2xl">
                                    {avatarFor(third.name)}
                                  </div>
                                  <p className="mt-1.5 max-w-[68px] truncate text-[11px] sm:text-xs font-medium text-white text-center">{third.name.split(" ")[0]}</p>
                                  <p className="text-[10px] sm:text-[11px] text-violet-200 font-semibold tabular-nums">{third.leadsToday}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Podium blocks */}
                          {first && (
                            <div className="relative flex items-end justify-center gap-1.5 sm:gap-2 mb-5">
                              {second && (
                                <div className="relative w-20 sm:w-24">
                                  <div className="absolute -top-1 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-violet-400/60 to-fuchsia-400/60" />
                                  <div className={`${podiumHeights[2]} rounded-t-lg bg-white/[0.04] backdrop-blur border border-white/10 border-b-0 flex items-start justify-center pt-2`}>
                                    <span className="text-2xl font-bold text-white/15">2</span>
                                  </div>
                                </div>
                              )}
                              <div className="relative w-24 sm:w-28">
                                <div className="absolute -top-1 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
                                <div className={`${podiumHeights[1]} rounded-t-lg bg-white/[0.06] backdrop-blur border border-violet-300/20 border-b-0 flex items-start justify-center pt-2`}>
                                  <span className="text-3xl font-bold text-white/20">1</span>
                                </div>
                              </div>
                              {third && (
                                <div className="relative w-20 sm:w-24">
                                  <div className="absolute -top-1 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-violet-400/60 to-fuchsia-400/60" />
                                  <div className={`${podiumHeights[3]} rounded-t-lg bg-white/[0.04] backdrop-blur border border-white/10 border-b-0 flex items-start justify-center pt-2`}>
                                    <span className="text-2xl font-bold text-white/15">3</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Ranks 4+ */}
                          <div className="relative space-y-2">
                            {rest.map((member, i) => (
                              <div
                                key={member.name}
                                className={`flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur px-3 py-2.5 transition-all duration-500 ease-out hover:bg-white/[0.07] hover:border-white/20 ${
                                  mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                                }`}
                                style={{ transitionDelay: `${250 + i * 70}ms` }}
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className="w-5 shrink-0 text-center text-xs font-semibold text-white/35 tabular-nums">
                                    {String(member.rank).padStart(2, "0")}
                                  </span>
                                  <div className="h-8 w-8 shrink-0 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-base">
                                    {avatarFor(member.name)}
                                  </div>
                                  <span className="truncate text-sm font-medium text-white">{member.name}</span>
                                </div>
                                <span className="shrink-0 text-sm font-bold text-violet-200 tabular-nums">
                                  {member.leadsToday}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Quick-nav links */}
      <div className="space-y-3">
        <Link
          href="/member-dashboard/timeline"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
              Attraction Timeline
            </h2>
          </div>
          <span className="shrink-0 text-brand-500 transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
