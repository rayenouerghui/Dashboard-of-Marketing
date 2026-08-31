"use client";

import { useState } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const TABS = [
  {
    key: "ogx",
    label: "OGX",
    emoji: "🌍",
    color: "bg-blue-500",
    lightBg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    url: "https://drive.google.com/drive/folders/1n12-FbU4r5Jb0vY3S6BSe-TMCYH7nBUC?usp=drive_link",
    description: "Outgoing Global Exchange — stories from EPs who went abroad.",
  },
  {
    key: "icx",
    label: "ICX",
    emoji: "🤝",
    color: "bg-emerald-500",
    lightBg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    url: "https://drive.google.com/drive/folders/11kKYCbpH_GDLLRzYs5I16sHwuNcWNV6z?usp=drive_link",
    description: "Incoming Exchange — testimonials from EPs who came to Tunisia.",
  },
  {
    key: "events",
    label: "Events",
    emoji: "🎪",
    color: "bg-violet-500",
    lightBg: "bg-violet-50 dark:bg-violet-500/10",
    border: "border-violet-200 dark:border-violet-500/30",
    text: "text-violet-600 dark:text-violet-400",
    url: "https://drive.google.com/drive/folders/1hzsfxhlQzkG_3qSLhXSiXXfNZiHiQcA-?usp=drive_link",
    description: "Events — member and participant testimonials from our events.",
  },
  {
    key: "conference",
    label: "Conference",
    emoji: "🎤",
    color: "bg-orange-500",
    lightBg: "bg-orange-50 dark:bg-orange-500/10",
    border: "border-orange-200 dark:border-orange-500/30",
    text: "text-orange-600 dark:text-orange-400",
    url: "https://drive.google.com/drive/folders/1hyUhEOU3j7o0vBnca9Cmz-KwAJ9u6fJT?usp=drive_link",
    description: "Conference — highlights and testimonials from our conferences.",
  },
  {
    key: "touchpoints",
    label: "TouchPoints",
    emoji: "📍",
    color: "bg-pink-500",
    lightBg: "bg-pink-50 dark:bg-pink-500/10",
    border: "border-pink-200 dark:border-pink-500/30",
    text: "text-pink-600 dark:text-pink-400",
    url: "https://drive.google.com/drive/folders/1QkZWWew29kzXyUnV14ULg6Gmev3DqbUG?usp=drive_link",
    description: "TouchPoints — testimonials collected at attraction touchpoints.",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestimonialsPage() {
  const [active, setActive] = useState<TabKey>("ogx");
  const current = TABS.find((t) => t.key === active)!;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
          Testimonials
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Real stories from AIESEC members and exchange participants — use these during attraction.
        </p>
      </div>

      {/* Tab strip — scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              active === tab.key
                ? "bg-brand-500 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06]"
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab card */}
      <div className={`rounded-2xl border p-6 ${current.lightBg} ${current.border}`}>

        {/* Icon + title row */}
        <div className="flex items-start gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${current.color}`}>
            {current.emoji}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {current.label} Testimonials
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {current.description}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 rounded-xl ${current.color} px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5zm0 1a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-11z"/>
              <path d="M10 8h4v4h-1V9.707l-4.146 4.147-.708-.708L12.293 9H10V8z"/>
            </svg>
            Open in Google Drive
          </a>
          <p className={`text-xs ${current.text}`}>
            Opens in a new tab · Google account may be required
          </p>
        </div>
      </div>

      {/* All categories quick-access grid */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          All categories
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TABS.map((tab) => (
            <a
              key={tab.key}
              href={tab.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setActive(tab.key)}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-white/[0.03] dark:hover:border-gray-600"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${tab.color}`}>
                {tab.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{tab.label}</p>
                <p className="truncate text-xs text-gray-400 dark:text-gray-500">Open folder ↗</p>
              </div>
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}
