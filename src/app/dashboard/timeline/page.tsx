"use client";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { MapPin, CalendarDays } from "lucide-react";

export const dynamic = 'force-dynamic';

const STORAGE_KEY = "customCalendarEvents";

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

export default function TimelinePage() {
  const [mounted, setMounted] = useState(false);
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [updateCounter, setUpdateCounter] = useState(0);

  // Load events on mount
  useEffect(() => {
    setMounted(true);
    loadEvents();
  }, []);

  // Listen for updates from attraction page
  useEffect(() => {
    const handleUpdate = (e?: Event) => {
      console.log("Timeline received update event", e);
      loadEvents();
      setUpdateCounter(prev => prev + 1);
    };

    window.addEventListener("attractionUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    
    console.log("Timeline event listeners registered");
    
    return () => {
      window.removeEventListener("attractionUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      console.log("Timeline event listeners removed");
    };
  }, []);

  // Fallback: poll localStorage every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const events = saved ? JSON.parse(saved) : [];
        if (events.length !== customEvents.length) {
          console.log("Timeline poll detected change:", events.length, "vs", customEvents.length);
          setCustomEvents(events);
          setUpdateCounter(prev => prev + 1);
        }
      } catch (error) {
        console.error("Timeline polling error:", error);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [customEvents.length]);

  function loadEvents() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const events = saved ? JSON.parse(saved) : [];
      setCustomEvents(events);
      console.log("Timeline loaded events:", events.length);
      console.log("Timeline events with dates:", events.map((e: CustomEvent) => ({ id: e.id, date: e.start, university: e.extendedProps.university })));
    } catch (error) {
      console.error("Failed to load events:", error);
      setCustomEvents([]);
    }
  }

  // Get current week Monday-Friday
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();

    // Calculate Monday of current week
    const monday = new Date(today);
    const diff = currentDay - 1;
    if (diff < 0) monday.setDate(today.getDate() - (6 - currentDay));
    else monday.setDate(today.getDate() - diff);

    monday.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const days: DayAttraction[] = [];

    console.log("Timeline calculating week for:", today.toISOString());

    for (let i = 0; i < 5; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      dayDate.setHours(0, 0, 0, 0);

      const dayStr = dayDate.toISOString().slice(0, 10);
      const todayStr = today.toISOString().slice(0, 10);
      const isToday = dayStr === todayStr;
      const isPast = dayDate < todayStart;

      console.log(`Timeline checking day ${dayNames[i]}: ${dayStr}`);

      // Find custom events for this day
      const dayCustomEvents = customEvents.filter((event) => {
        const matches = event.start === dayStr;
        console.log(`  Event ${event.extendedProps.university} with date ${event.start} matches ${dayStr}: ${matches}`);
        return matches;
      });

      days.push({
        date: dayDate,
        dayName: dayNames[i],
        attractions: dayCustomEvents,
        isToday,
        isPast,
      });
    }

    return days;
  }, [customEvents, updateCounter]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Timeline Attraction
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Weekly attraction schedule (Monday - Friday)
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {customEvents.length} attraction{customEvents.length !== 1 ? "s" : ""} scheduled
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-0 right-0 top-8 hidden h-0.5 bg-gray-200 dark:bg-gray-700 md:block" />

        <div className="relative grid grid-cols-1 gap-5 md:grid-cols-5">
          {weekDays.map((day, index) => (
            <div key={index} className="relative">
              <div
                className={`absolute left-1/2 top-6 z-10 hidden h-4 w-4 -translate-x-1/2 rounded-full border-2 md:flex ${
                  day.isToday
                    ? "border-green-500 bg-green-500"
                    : day.isPast
                    ? "border-gray-300 bg-gray-300 dark:border-gray-600 dark:bg-gray-600"
                    : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                }`}
              />

              <div
                className={`mt-12 rounded-xl border p-4 transition-all ${
                  day.isToday
                    ? "border-green-400 bg-green-50 shadow-sm dark:border-green-500/60 dark:bg-green-900/10"
                    : day.isPast
                    ? "border-gray-200 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800/40"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-white/[0.02]"
                }`}
              >
                <div className="mb-4 text-center">
                  <p
                    className={`text-sm font-bold uppercase tracking-wide ${
                      day.isToday ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {day.dayName}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  {day.isToday && (
                    <span className="mt-1.5 inline-block rounded-full bg-green-500 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                      Today
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  {day.attractions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 py-5 text-center dark:border-gray-700">
                      <p className="text-xs text-gray-400 dark:text-gray-500">No attractions</p>
                    </div>
                  ) : (
                    day.attractions.map((attraction, idx) => (
                      <div
                        key={attraction.id || idx}
                        className="rounded-lg border border-blue-200 bg-blue-50 p-3 transition-shadow hover:shadow-sm dark:border-blue-800 dark:bg-blue-900/15"
                      >
                        <div className="mb-2 flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-blue-500" />
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                            Scheduled
                          </span>
                        </div>

                        <div className="flex items-start gap-2.5">
                          {attraction.extendedProps.universityLogo ? (
                            <Image
                              src={attraction.extendedProps.universityLogo}
                              alt={attraction.extendedProps.university}
                              width={32}
                              height={32}
                              className="h-8 w-8 shrink-0 rounded-full border border-gray-200 object-cover dark:border-gray-600"
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-[11px] font-bold text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              {attraction.extendedProps.university.substring(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                              {attraction.extendedProps.university}
                            </p>
                            {attraction.extendedProps.note && (
                              <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
                                {attraction.extendedProps.note}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 border-t border-gray-100 pt-4 text-xs dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-gray-600 dark:text-gray-400">Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span className="text-gray-600 dark:text-gray-400">Past</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-gray-200 border border-gray-300 dark:bg-gray-700 dark:border-gray-600" />
          <span className="text-gray-600 dark:text-gray-400">Upcoming</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Scheduled Attraction</span>
        </div>
      </div>
    </div>
  );
}
