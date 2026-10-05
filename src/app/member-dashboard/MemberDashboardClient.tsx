"use client";

import Link from "next/link";
import { isSourceLabel } from "@/data/sourceLabels";
import type { PhysicalAttractionLead } from "@/lib/dataUtils";
import { useEffect, useMemo, useState } from "react";

const ANIMAL_AVATARS = ["🦊", "🐼", "🦁", "🐨", "🐯", "🐰", "🦉", "🐺", "🐸", "🐻"];

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DEFAULT_GOAL = 30;
const TOP_MEMBERS_LIMIT = 6;
const ATTRACTIONS_CACHE_KEY = "member-dashboard.today-attractions.v1";

type RankingMember = {
  name: string;
  leadsToday: number;
  rank: number;
};

type RankingSnapshot = {
  university: string;
  leadCount: number;
  leaderboard: RankingMember[];
  generatedAt: string;
};

function readSessionCache<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeSessionCache<T>(key: string, value: T) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore storage failures */
  }
}

export function normalizeLeaderboardMemberName(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";

  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
  if (!normalized) return "";
  if (isSourceLabel(normalized) || isSourceLabel(trimmed)) return "";

  return normalized;
}

function buildAttractionRanking(university: string, leads: PhysicalAttractionLead[]): RankingSnapshot {
  const universityKey = university.trim().toLowerCase();
  const universityLeads = leads.filter((lead) => {
    const leadKey = (lead.university ?? "").trim().toLowerCase();
    return leadKey === universityKey || leadKey.includes(universityKey) || universityKey.includes(leadKey);
  });
  const leaderboardMap = new Map<string, number>();

  for (const lead of universityLeads) {
    const memberName = normalizeLeaderboardMemberName(lead.memberName);
    if (!memberName) continue;
    leaderboardMap.set(memberName, (leaderboardMap.get(memberName) ?? 0) + 1);
  }

  const leaderboard = [...leaderboardMap.entries()]
    .map(([name, leadsToday]) => ({ name, leadsToday, totalLeads: leadsToday }))
    .sort((a, b) => b.leadsToday - a.leadsToday || b.totalLeads - a.totalLeads || a.name.localeCompare(b.name))
    .slice(0, TOP_MEMBERS_LIMIT)
    .map((member, index) => ({
      name: member.name,
      leadsToday: member.leadsToday,
      rank: index + 1,
    }));

  return {
    university,
    leadCount: universityLeads.length,
    leaderboard,
    generatedAt: new Date().toISOString(),
  };
}

export function mergeTodayAttractions(previous: CustomEvent[], next: CustomEvent[]) {
  if (next.length > 0) return next;
  if (previous.length > 0) return previous;
  return [];
}

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

async function fetchTodaysAttractions(): Promise<CustomEvent[]> {
  try {
    const res = await fetch("/api/scheduled-attractions", { cache: "no-store" });
    if (!res.ok) return [];
    const events: CustomEvent[] = await res.json();
    const todayStr = toLocalDateString(new Date());
    return events.filter((e) => String(e.start ?? "").slice(0, 10) === todayStr);
  } catch {
    return [];
  }
}

export default function MemberDashboardClient({
  initialLeads = [],
}: {
  initialLeads?: PhysicalAttractionLead[];
}) {
  const [mounted, setMounted] = useState(false);
  const [todaysAttractions, setTodaysAttractions] = useState<CustomEvent[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    setTodaysAttractions(readSessionCache<CustomEvent[]>(ATTRACTIONS_CACHE_KEY, []));
  }, []);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    writeSessionCache(ATTRACTIONS_CACHE_KEY, todaysAttractions);
  }, [todaysAttractions]);

  useEffect(() => {
    const handleSync = async () => {
      const next = await fetchTodaysAttractions();
      setTodaysAttractions((previous) => {
        const merged = mergeTodayAttractions(previous, next);
        setActiveTab((currentTab) => (currentTab < merged.length ? currentTab : 0));
        return merged;
      });
    };

    handleSync();
    window.addEventListener("storage", handleSync);
    window.addEventListener("attractionUpdated", handleSync);

    const interval = setInterval(handleSync, 10000);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("attractionUpdated", handleSync);
      clearInterval(interval);
    };
  }, []);

  const hasAttractionToday = todaysAttractions.length > 0;
  const multipleAttractions = todaysAttractions.length > 1;
  const currentAttraction = todaysAttractions[activeTab] ?? null;
  const currentUniversity = currentAttraction?.extendedProps.university ?? "";

  const attractionData = useMemo(
    () =>
      todaysAttractions.map((attraction) => ({
        attraction,
        dailyGoal: attraction.extendedProps.goal ?? DEFAULT_GOAL,
      })),
    [todaysAttractions]
  );

  const current = attractionData[activeTab];
  const currentRanking = useMemo(() => {
    if (!currentAttraction || !currentUniversity) return undefined;
    return buildAttractionRanking(currentUniversity, initialLeads);
  }, [currentAttraction, currentUniversity, initialLeads]);
  const dailyGoal = currentAttraction?.extendedProps.goal ?? DEFAULT_GOAL;
  const leadCount = currentRanking?.leadCount ?? 0;
  const goalPct = currentAttraction ? Math.min(100, Math.round((leadCount / dailyGoal) * 100)) : 0;
  const leaderboard = currentRanking?.leaderboard ?? [];

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
                      {leadCount}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Goal</p>
                    <p className="mt-1 text-lg font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                      {dailyGoal}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-700 ease-out"
                    style={{ width: mounted ? `${goalPct}%` : "0%" }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {goalPct >= 100
                    ? "Daily goal reached 🎉"
                    : `${goalPct}% of today's goal · ${Math.max(0, dailyGoal - leadCount)} to go`}
                </p>
                <p className="mt-2 truncate text-xs font-medium text-gray-400 dark:text-gray-500">
                  📍 {currentAttraction?.extendedProps.university}
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
                      {currentAttraction?.extendedProps.university} · ranking data
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur px-3 py-1.5 text-xs font-semibold text-violet-200">
                    <span>🏆</span>
                    <span className="tabular-nums">{leadCount}</span>
                  </div>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="relative rounded-xl border border-dashed border-white/15 py-8 text-center">
                    <p className="text-sm text-violet-200/60">No leads brought in yet today — be the first!</p>
                  </div>
                ) : (
                  <>
                    {/* Top 3 */}
                    {(() => {
                      const first  = leaderboard.find((m) => m.rank === 1);
                      const second = leaderboard.find((m) => m.rank === 2);
                      const third  = leaderboard.find((m) => m.rank === 3);
                      const rest   = leaderboard.filter((m) => m.rank > 3);

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