"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

export const dynamic = 'force-dynamic';

// Simple placeholder for Image to avoid SSR issues
const SafeImage = ({ src, alt, width, height, className, style }: any) => {
  if (typeof window === "undefined") return <div className={className} style={style} />;
  return <img src={src} alt={alt} width={width} height={height} className={className} style={style} />;
};

// Simple SVG icons to avoid lucide-react SSR issues
const CalendarPlus = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
    <line x1="12" y1="15" x2="12" y2="18"></line>
    <line x1="12" y1="15" x2="15" y2="15"></line>
  </svg>
);

const LayoutList = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const Trash2 = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"></path>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const Check = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const MapPin = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const StickyNote = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"></path>
    <polyline points="15 3 15 9 21 9"></polyline>
  </svg>
);

const Building2 = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path>
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path>
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path>
    <path d="M10 6h4"></path>
    <path d="M10 10h4"></path>
    <path d="M10 14h4"></path>
    <path d="M10 18h4"></path>
  </svg>
);

const CalendarDays = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
    <path d="M8 14h.01"></path>
    <path d="M12 14h.01"></path>
    <path d="M16 14h.01"></path>
    <path d="M8 18h.01"></path>
    <path d="M12 18h.01"></path>
    <path d="M16 18h.01"></path>
  </svg>
);

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
  };
}

interface DayAttraction {
  date: Date;
  dayName: string;
  attractions: CustomEvent[];
  isToday: boolean;
  isPast: boolean;
}

// ---------- small presentational helpers ----------

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-3.5 ${
        active
          ? "bg-white text-brand-600 shadow-sm dark:bg-gray-700 dark:text-white"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function LogoOrInitials({ src, name, size = 40 }: { src?: string; name: string; size?: number }) {
  if (src) {
    return (
      <SafeImage
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full border border-gray-200 object-cover dark:border-gray-600"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-[11px] font-bold text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
    >
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-10 text-center dark:border-gray-700">
      <CalendarDays className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No attractions scheduled yet</p>
      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Use the form to add the first one</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-3 w-3 rounded-full ${color}`} />
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

const UNIVERSITY_LOGOS = [
  "ECB.png",
  "ENS_Logo_TL.jpg",
  "ESPRIT.jpg",
  "ESSECT.jpg",
  "FMT.png",
  "FSHST.jpg",
  "HIDE.png",
  "ISBAT.jpg",
  "ISG.jpg",
  "ISMT.jpg",
  "TBS.jpg",
  "ensit.jpg",
  "iseaht-logo.jpg",
  "iset chargia.jpg",
];

// Must match the key used on the Timeline page so both stay in sync.
const STORAGE_KEY = "customCalendarEvents";

const EMPTY_FORM = {
  date: new Date().toISOString().split("T")[0],
  university: "",
  universityLogo: "",
  note: "",
};

export default function AttractionPage() {
  const { role } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"create" | "preview">("create");
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<CustomEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  const canCreateAttraction = role === "admin";

  // ---------- load / sync (all hooks run every render, before any early return) ----------

  useEffect(() => {
    setMounted(true);
    readFromStorage();
  }, []);

  useEffect(() => {
    const handleSync = () => {
      readFromStorage();
      setForceUpdate((prev) => prev + 1);
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("attractionUpdated", handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("attractionUpdated", handleSync);
    };
  }, []);

  // Fallback: poll localStorage every 2 seconds in case an update happens
  // without dispatching an event.
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const events = saved ? JSON.parse(saved) : [];
        if (events.length !== customEvents.length) {
          setCustomEvents(events);
          setForceUpdate((prev) => prev + 1);
        }
      } catch {
        // ignore malformed storage
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [customEvents.length]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  function readFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setCustomEvents(saved ? JSON.parse(saved) : []);
    } catch {
      setCustomEvents([]);
    }
  }

  function writeToStorage(events: CustomEvent[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
      // Notify this tab's other components (e.g. the Timeline page) immediately.
      // The native "storage" event only fires in *other* tabs, so we also
      // dispatch a custom event for same-tab listeners.
      window.dispatchEvent(new CustomEvent("attractionUpdated", { detail: events }));
    } catch (error) {
      console.error("Failed to save custom events to localStorage", error);
    }
  }

  // ---------- actions ----------

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.university.trim() || !formData.date) return;

    const newEvent: CustomEvent = {
      id: `custom-${Date.now()}`,
      title: `${formData.university} - Physical Attraction`,
      start: formData.date,
      backgroundColor: "#465FFF",
      borderColor: "#465FFF",
      extendedProps: {
        university: formData.university.trim(),
        universityLogo: formData.universityLogo || undefined,
        note: formData.note.trim() || undefined,
      },
    };

    const updated = [...customEvents, newEvent];
    setCustomEvents(updated);
    writeToStorage(updated);

    setFormData(EMPTY_FORM);
    setToast(`Attraction added for ${newEvent.extendedProps.university} — now visible on the timeline`);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const updated = customEvents.filter((e) => e.id !== pendingDelete.id);
    setCustomEvents(updated);
    writeToStorage(updated);
    setToast(`Removed ${pendingDelete.extendedProps.university}`);
    setPendingDelete(null);
  };

  // ---------- derived data ----------

  const sortedEvents = useMemo(
    () => [...customEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [customEvents]
  );

  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();

    const monday = new Date(today);
    const diff = currentDay - 1;
    if (diff < 0) monday.setDate(today.getDate() - (6 - currentDay));
    else monday.setDate(today.getDate() - diff);
    monday.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const days: DayAttraction[] = [];

    for (let i = 0; i < 5; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      dayDate.setHours(0, 0, 0, 0);

      const dayStr = dayDate.toISOString().slice(0, 10);

      days.push({
        date: dayDate,
        dayName: dayNames[i],
        attractions: customEvents.filter((event) => event.start === dayStr),
        isToday: dayStr === todayStr,
        isPast: dayDate < todayStart,
      });
    }

    return days;
  }, [customEvents, forceUpdate]);

  // Now that every hook above has run, it's safe to gate the visible output.
  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
            Attraction Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Schedule attractions — they show up on the Timeline page automatically
          </p>
        </div>

        {canCreateAttraction && (
          <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <TabButton
              active={view === "create"}
              onClick={() => setView("create")}
              icon={<CalendarPlus className="h-4 w-4" />}
              label="Create"
            />
            <TabButton
              active={view === "preview"}
              onClick={() => setView("preview")}
              icon={<LayoutList className="h-4 w-4" />}
              label="Preview"
            />
          </div>
        )}
      </div>

      {/* Create view */}
      {view === "create" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {canCreateAttraction && (
            <div className="h-fit rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">New Attraction</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Fill in the details to add it to the schedule
                </p>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4">
                <Field label="Date" icon={<CalendarDays className="h-3.5 w-3.5" />}>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </Field>

                <Field label="University Name" icon={<Building2 className="h-3.5 w-3.5" />}>
                  <input
                    type="text"
                    required
                    placeholder="e.g., ENSIT"
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </Field>

                <Field label="University Logo (optional)">
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
                    {UNIVERSITY_LOGOS.map((logo) => {
                      const path = `/images/university-logos/${logo}`;
                      const selected = formData.universityLogo === path;
                      return (
                        <button
                          key={logo}
                          type="button"
                          title={logo}
                          onClick={() =>
                            setFormData({ ...formData, universityLogo: selected ? "" : path })
                          }
                          className={`relative flex aspect-square items-center justify-center rounded-lg border-2 p-1 transition-all ${
                            selected
                              ? "border-brand-500 ring-2 ring-brand-500/30"
                              : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                          }`}
                        >
                          <SafeImage
                            src={path}
                            alt={logo}
                            width={32}
                            height={32}
                            className="h-full w-full rounded object-contain"
                          />
                          {selected && (
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Note (optional)" icon={<StickyNote className="h-3.5 w-3.5" />}>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows={3}
                    placeholder="Add any additional notes..."
                    className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </Field>

                <div className="flex gap-2 pt-1">
                  {(formData.university || formData.note || formData.universityLogo) && (
                    <button
                      type="button"
                      onClick={() => setFormData(EMPTY_FORM)}
                      className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700"
                  >
                    Add Attraction
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Scheduled list */}
          <div className={canCreateAttraction ? "lg:col-span-3" : "lg:col-span-5"}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Scheduled Attractions
                </h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {customEvents.length}
                </span>
              </div>

              {sortedEvents.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-2">
                  {sortedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <LogoOrInitials
                          src={event.extendedProps.universityLogo}
                          name={event.extendedProps.university}
                          size={36}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-800 dark:text-white">
                            {event.extendedProps.university}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(event.start).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          {event.extendedProps.note && (
                            <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
                              {event.extendedProps.note}
                            </p>
                          )}
                        </div>
                      </div>
                      {canCreateAttraction && (
                        <button
                          onClick={() => setPendingDelete(event)}
                          className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          aria-label="Delete attraction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview view — mirrors the Timeline page's layout exactly */}
      {view === "preview" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Member Timeline Preview
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              How members will see the schedule for this week
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5 md:gap-4">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`rounded-lg border p-3 ${
                  day.isToday
                    ? "border-green-300 bg-green-50/60 dark:border-green-700 dark:bg-green-900/10"
                    : day.isPast
                    ? "border-gray-100 bg-gray-50 opacity-70 dark:border-gray-800 dark:bg-gray-800/30"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-white/[0.02]"
                }`}
              >
                <div className="mb-3 flex items-center justify-between md:flex-col md:items-center md:gap-0.5 md:text-center">
                  <div className="flex items-baseline gap-2 md:flex-col md:gap-0.5">
                    <span
                      className={`text-sm font-semibold ${
                        day.isToday ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {day.dayName}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {day.isToday && (
                    <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Today
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {day.attractions.length === 0 ? (
                    <div className="rounded-md border border-dashed border-gray-200 py-4 text-center dark:border-gray-700">
                      <p className="text-xs text-gray-400 dark:text-gray-500">No attractions</p>
                    </div>
                  ) : (
                    day.attractions.map((attraction, idx) => {
                      const isHappeningToday = day.isToday;
                      return (
                        <div
                          key={attraction.id || idx}
                          className={`rounded-md p-2.5 ${
                            isHappeningToday
                              ? "border-2 border-green-400 bg-green-100 dark:border-green-600 dark:bg-green-900/25"
                              : "border border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/10"
                          }`}
                        >
                          <div className="mb-1.5 flex items-center gap-1">
                            <MapPin className={`h-3 w-3 ${isHappeningToday ? "text-green-600" : "text-blue-500"}`} />
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wide ${
                                isHappeningToday ? "text-green-700 dark:text-green-400" : "text-blue-600 dark:text-blue-300"
                              }`}
                            >
                              {isHappeningToday ? "Today" : "Scheduled"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <LogoOrInitials
                              src={attraction.extendedProps.universityLogo}
                              name={attraction.extendedProps.university}
                              size={28}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                                {attraction.extendedProps.university}
                              </p>
                              {attraction.extendedProps.note && (
                                <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                                  {attraction.extendedProps.note}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
            <Legend color="bg-green-500" label="Today / happening today" />
            <Legend color="bg-blue-500" label="Scheduled (upcoming)" />
            <Legend color="bg-gray-300 dark:bg-gray-600" label="Past" />
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">Remove this attraction?</h3>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              {pendingDelete.extendedProps.university} on{" "}
              {new Date(pendingDelete.start).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}{" "}
              will be permanently removed.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2.5 text-center text-sm text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
          {toast}
        </div>
      )}
    </div>
  );
}