"use client";

import { useLayoutEffect, useRef, useState } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const TABS = [
  {
    key: "ogx",
    label: "OGX",
    emoji: "🌍",
    accent: "#3b82f6",
    url: "https://drive.google.com/drive/folders/1n12-FbU4r5Jb0vY3S6BSe-TMCYH7nBUC?usp=drive_link",
    description: "Outgoing Global Exchange — stories from EPs who went abroad.",
  },
  {
    key: "icx",
    label: "ICX",
    emoji: "🤝",
    accent: "#10b981",
    url: "https://drive.google.com/drive/folders/11kKYCbpH_GDLLRzYs5I16sHwuNcWNV6z?usp=drive_link",
    description: "Incoming Exchange — testimonials from EPs who came to Tunisia.",
  },
  {
    key: "events",
    label: "Events",
    emoji: "🎪",
    accent: "#8b5cf6",
    url: "https://drive.google.com/drive/folders/1hzsfxhlQzkG_3qSLhXSiXXfNZiHiQcA-?usp=drive_link",
    description: "Events — member and participant testimonials from our events.",
  },
  {
    key: "conference",
    label: "Conference",
    emoji: "🎤",
    accent: "#f97316",
    url: "https://drive.google.com/drive/folders/1hyUhEOU3j7o0vBnca9Cmz-KwAJ9u6fJT?usp=drive_link",
    description: "Conference — highlights and testimonials from our conferences.",
  },
  {
    key: "touchpoints",
    label: "TouchPoints",
    emoji: "📍",
    accent: "#ec4899",
    url: "https://drive.google.com/drive/folders/1QkZWWew29kzXyUnV14ULg6Gmev3DqbUG?usp=drive_link",
    description: "TouchPoints — testimonials collected at attraction touchpoints.",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestimonialsPage() {
  const [active, setActive] = useState<TabKey>("ogx");
  const current = TABS.find((t) => t.key === active)!;

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = tabRefs.current[active];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [active]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
          Testimonials
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Real stories from AIESEC members and exchange participants — use these during attraction.
        </p>
      </div>

      {/* Tab strip with sliding indicator */}
      <div className="relative">
        <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-white/[0.03]">
          {/* sliding pill */}
          <div
            className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm transition-all duration-300 ease-out dark:bg-white/10"
            style={{ left: indicator.left, width: indicator.width }}
          />
          {TABS.map((tab) => (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              onClick={() => setActive(tab.key)}
              className={`relative z-10 shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                active === tab.key
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <span className="mr-1.5">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active tab card */}
      <div
        key={current.key}
        className="animate-fade-in rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.02]"
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
            style={{ backgroundColor: `${current.accent}1A` }}
          >
            {current.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {current.label} Testimonials
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {current.description}
            </p>
          </div>
        </div>

        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] sm:w-auto sm:px-6"
          style={{ backgroundColor: current.accent }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5zm0 1a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-11z" />
            <path d="M10 8h4v4h-1V9.707l-4.146 4.147-.708-.708L12.293 9H10V8z" />
          </svg>
          Open in Google Drive
        </a>
        <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500 sm:text-left">
          Opens in a new tab · Google account may be required
        </p>
      </div>

      {/* All categories quick-access list */}
      <div>
        <p className="mb-2 text-xs font-medium text-gray-400 dark:text-gray-500">
          All categories
        </p>
        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-white/[0.02] sm:hidden">
          {TABS.map((tab) => (
            <a
              key={tab.key}
              href={tab.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-white/[0.04]"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                style={{ backgroundColor: `${tab.accent}1A` }}
              >
                {tab.emoji}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium text-gray-800 dark:text-white/90">
                {tab.label}
              </span>
              <svg className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z" clipRule="evenodd" />
              </svg>
            </a>
          ))}
        </div>

        {/* Grid on larger screens */}
        <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {TABS.map((tab) => (
            <a
              key={tab.key}
              href={tab.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-gray-700"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: `${tab.accent}1A` }}
              >
                {tab.emoji}
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                {tab.label}
              </span>
            </a>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}