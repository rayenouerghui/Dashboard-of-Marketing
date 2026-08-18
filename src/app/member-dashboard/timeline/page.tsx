"use client";

// Disable SSR for this page to prevent hydration mismatch
export const dynamic = 'force-dynamic';

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { getPhysicalAttractionLeads } from "@/lib/dataUtils";
import { PhysicalAttractionLead } from "@/lib/dataUtils";

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
    attractionType: string;
  };
}

interface DayAttraction {
  date: Date;
  dayName: string;
  attractions: (PhysicalAttractionLead | CustomEvent)[];
  isToday: boolean;
  isPast: boolean;
}

export default function TimelinePage() {
  const [physicalLeads, setPhysicalLeads] = useState<PhysicalAttractionLead[]>([]);
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load data only on client
    try {
      const saved = localStorage.getItem("customCalendarEvents");
      setCustomEvents(saved ? JSON.parse(saved) : []);
      setPhysicalLeads(getPhysicalAttractionLeads());
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }, []);

  // Get current week Monday-Friday
  const weekDays = useMemo(() => {
    if (!mounted) return [];

    const today = new Date();
    const currentDay = today.getDay();
    
    // Calculate Monday of current week
    const monday = new Date(today);
    const diff = currentDay - 1; // 1 = Monday
    if (diff < 0) monday.setDate(today.getDate() - (6 - currentDay)); // If Sunday, go back 6 days
    else monday.setDate(today.getDate() - diff);
    
    monday.setHours(0, 0, 0, 0);

    const days: DayAttraction[] = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    for (let i = 0; i < 5; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      dayDate.setHours(0, 0, 0, 0);

      const dayStr = dayDate.toISOString().slice(0, 10);
      const isToday = dayStr === today.toISOString().slice(0, 10);
      const isPast = dayDate < new Date(today.setHours(0, 0, 0, 0));

      // Find physical attraction leads for this day
      const dayLeads = physicalLeads.filter(lead => {
        const leadDate = new Date(lead.submittedAt).toISOString().slice(0, 10);
        return leadDate === dayStr;
      });

      // Find custom calendar events for this day
      const dayCustomEvents = customEvents.filter(event => {
        const eventDate = event.start;
        return eventDate === dayStr;
      });

      // Combine both types
      const dayAttractions: (PhysicalAttractionLead | CustomEvent)[] = [
        ...dayLeads,
        ...dayCustomEvents
      ];

      days.push({
        date: dayDate,
        dayName: dayNames[i],
        attractions: dayAttractions,
        isToday,
        isPast
      });
    }

    return days;
  }, [physicalLeads, customEvents, mounted]);

  const getUniversityLogo = (university: string) => {
    // Map university names to logo paths
    const universityMap: Record<string, string> = {
      'FMT: Faculté de Médecine de Tunis': '/images/logo/fmt.png',
      'IPT: Institut Préparatoire aux Études d\'Ingénieurs de Tunis': '/images/logo/ipt.png',
      'ENIT: École Nationale d\'Ingénieurs de Tunis': '/images/logo/enit.png',
      'FST: Faculté des Sciences de Tunis': '/images/logo/fst.png',
      'ISG: Institut Supérieur de Gestion': '/images/logo/isg.png',
    };
    
    const shortName = university.split(':')[0]?.trim() || university;
    return universityMap[university] || universityMap[shortName] || '/images/logo/default-university.png';
  };

  const getShortUniversityName = (university: string) => {
    if (university.includes(':')) {
      return university.split(':')[0].trim();
    }
    return university.length > 25 ? university.substring(0, 25) + '...' : university;
  };

  // Helper functions to safely extract properties from either event type
  const getAttractionUniversity = (attraction: PhysicalAttractionLead | CustomEvent): string => {
    if ('university' in attraction) {
      return attraction.university;
    }
    return attraction.extendedProps.university;
  };

  const getAttractionType = (attraction: PhysicalAttractionLead | CustomEvent): string => {
    if ('internshipType' in attraction) {
      return attraction.internshipType;
    }
    return attraction.extendedProps.attractionType;
  };

  const getDayBadgeColor = (attraction: PhysicalAttractionLead | CustomEvent) => {
    if ('id' in attraction && attraction.id?.startsWith('custom-')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if ('accountStatus' in attraction && attraction.accountStatus.includes('✅')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  };

  const getAttractionReferral = (attraction: PhysicalAttractionLead | CustomEvent): string => {
    if ('referral' in attraction) {
      return attraction.referral;
    }
    return attraction.extendedProps.note || '';
  };

  const getAttractionLogo = (attraction: PhysicalAttractionLead | CustomEvent): string | undefined => {
    if ('extendedProps' in attraction) {
      return attraction.extendedProps.universityLogo || getUniversityLogo(attraction.extendedProps.university);
    }
    return undefined;
  };

  const isCustomEvent = (attraction: PhysicalAttractionLead | CustomEvent): boolean => {
    return 'id' in attraction && attraction.id?.startsWith('custom-');
  };

  if (!mounted) {
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
        </div>
        <div className="p-8 border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-300">Loading timeline...</p>
        </div>
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
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 hidden md:block"></div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-5 relative">
          {weekDays.map((day, index) => (
            <div key={index} className="relative">
              {/* Timeline Node */}
              <div className={`hidden md:flex absolute top-7 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 z-10 ${
                day.isToday
                  ? 'bg-green-500 border-green-500'
                  : day.isPast
                  ? 'bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600'
                  : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600'
              }`}></div>
              
              {/* Day Card */}
              <div
                className={`mt-12 rounded-xl border p-5 transition-all shadow-sm ${
                  day.isToday
                    ? 'border-green-500 bg-green-50 dark:border-green-400 dark:bg-green-900/20 shadow-md'
                    : day.isPast
                    ? 'border-gray-200 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800/50'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-white/[0.03]'
                }`}
              >
                {/* Day Header */}
                <div className="mb-4 text-center">
                  <p className={`text-lg font-bold ${
                    day.isToday
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-gray-800 dark:text-white'
                  }`}>
                    {day.dayName}
                  </p>
                  <p className={`text-sm ${
                    day.isToday
                      ? 'text-green-600 dark:text-green-500'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  {day.isToday && (
                    <span className="mt-2 inline-block rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
                      Today
                    </span>
                  )}
                </div>

                {/* Attractions */}
                <div className="space-y-3">
                  {day.attractions.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 py-6 text-center dark:border-gray-700">
                      <p className="text-sm text-gray-400 dark:text-gray-500">No attractions</p>
                    </div>
                  ) : (
                    day.attractions.map((attraction, idx) => {
                      const university = getAttractionUniversity(attraction);
                      const attractionType = getAttractionType(attraction);
                      const referral = getAttractionReferral(attraction);
                      const logo = getAttractionLogo(attraction);
                      const isCustom = isCustomEvent(attraction);

                      return (
                        <div
                          key={`${isCustom ? 'custom' : 'lead'}-${idx}`}
                          className={`rounded-lg border p-3.5 transition-all hover:shadow-sm ${
                            isCustom
                              ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                              : day.isToday
                              ? 'border-emerald-200 bg-white dark:border-emerald-700 dark:bg-gray-800'
                              : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${getDayBadgeColor(attraction)}`}>
                              {isCustom ? 'Scheduled' : 'Lead'}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                              {attractionType}
                            </span>
                          </div>

                          <div className="flex items-start gap-3">
                            {logo ? (
                              <div className="relative h-12 w-12 shrink-0 rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden">
                                <Image
                                  src={logo}
                                  alt="University Logo"
                                  fill
                                  className="object-contain p-1"
                                  sizes="48px"
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-xs font-bold text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                {getShortUniversityName(university).substring(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                                {getShortUniversityName(university)}
                              </p>
                              {referral && (
                                <p className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">
                                  {referral}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
                            <span>{isCustom ? 'Manual' : 'From leads'}</span>
                            <span>{day.attractions.filter((a) => getAttractionUniversity(a) === university).length} total</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Past</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Upcoming</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Scheduled Attraction</span>
        </div>
      </div>
    </div>
  );
}
