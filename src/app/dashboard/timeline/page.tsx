"use client";
import React, { useMemo, useState, useEffect } from "react";
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
  const physicalLeads = getPhysicalAttractionLeads();
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);

  // Load custom events from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("customCalendarEvents");
    if (saved) {
      setCustomEvents(JSON.parse(saved));
    }
  }, []);

  // Get current week Monday-Friday
  const weekDays = useMemo(() => {
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
  }, [physicalLeads, customEvents]);

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

  const getAttractionReferral = (attraction: PhysicalAttractionLead | CustomEvent): string => {
    if ('referral' in attraction) {
      return attraction.referral;
    }
    return attraction.extendedProps.note || '';
  };

  const getAttractionLogo = (attraction: PhysicalAttractionLead | CustomEvent): string | undefined => {
    if ('extendedProps' in attraction) {
      return attraction.extendedProps.universityLogo;
    }
    return undefined;
  };

  const isCustomEvent = (attraction: PhysicalAttractionLead | CustomEvent): boolean => {
    return 'id' in attraction && attraction.id?.startsWith('custom-');
  };

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
                    <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg dark:border-gray-700">
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
                          className={`rounded-lg border p-4 transition-all hover:shadow-md ${
                            isCustom
                              ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                              : day.isToday
                              ? 'border-green-300 bg-white dark:border-green-700 dark:bg-gray-800'
                              : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                          }`}
                        >
                          {/* University Logo */}
                          <div className="flex items-center gap-3 mb-3">
                            {logo ? (
                              <img
                                src={logo}
                                alt="University Logo"
                                className="h-10 w-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden dark:from-gray-700 dark:to-gray-600 border-2 border-gray-200 dark:border-gray-600">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                  {getShortUniversityName(university).substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                {getShortUniversityName(university)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {attractionType}
                              </p>
                            </div>
                          </div>

                          {/* Referral/Source */}
                          {referral && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                <span className="font-medium">Source:</span> {referral}
                              </p>
                            </div>
                          )}

                          {/* Badge */}
                          <div className="flex items-center justify-between">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                              isCustom
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : day.isToday
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {isCustom ? '📅 Scheduled' : '👤 Lead'}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {day.attractions.filter(a => getAttractionUniversity(a) === university).length}
                            </span>
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
