"use client";

import Link from "next/link";
import { getUniversities } from "@/lib/dataUtils";
import { useEffect, useState } from "react";
import Image from "next/image";

// ---- Product colors + logos (same palette used across Opportunities) ----
const PRODUCT_COLORS: Record<string, string> = {
  GTa: "#0CB9C1",
  GTe: "#F48924",
  GV: "#F85A40",
};

// Place the uploaded logo files at these paths in /public
const PRODUCT_LOGOS: Record<string, string> = {
  GTa: "/images/products/gta.png",
  GTe: "/images/products/gte.png",
  GV: "/images/products/gv.png",
};

type Tag = { label: string; color: string; logo: string };

interface UniversityGroup {
  id: string;
  title?: string; // used only when there are no tags
  tags: Tag[];
  subtitle?: string;
  keywords: string[]; // matched against short + full university name
}

const tag = (label: keyof typeof PRODUCT_COLORS): Tag => ({
  label,
  color: PRODUCT_COLORS[label],
  logo: PRODUCT_LOGOS[label],
});

// ---- Groupings you specified ----
const GROUPS: UniversityGroup[] = [
  {
    id: "gte-teaching",
    tags: [tag("GTe")],
    subtitle: "Teaching",
    keywords: ["FSHST", "Musique"],
  },
  {
    id: "gta-mkt-gv",
    tags: [tag("GTa"), tag("GV")],
    subtitle: "Marketing profiles",
    keywords: ["ISG", "ESSECT", "TBS", "ESB"],
  },
  {
    id: "gta-it",
    tags: [tag("GTa")],
    subtitle: "IT profiles",
    keywords: ["ESPRIT", "ENSIT", "ISET Charguia", "ISBAT", "HIDE", "FMT"],
  },
];

function getShortName(name: string) {
  return name.includes(":") ? name.split(":")[0].trim() : name;
}

function matchesGroup(universityName: string, group: UniversityGroup) {
  const shortName = getShortName(universityName).toLowerCase();
  const fullName = universityName.toLowerCase();
  return group.keywords.some((k) => {
    const kw = k.toLowerCase();
    return shortName === kw || shortName.includes(kw) || fullName.includes(kw);
  });
}

export default function SalesClient() {
  const universities = getUniversities();
  const [mounted, setMounted] = useState(false);
  const [pressedId, setPressedId] = useState<string | null>(null);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Bucket universities into groups; anything unmatched falls into "Other"
  const categorized = GROUPS.map((group) => ({
    group,
    universities: universities.filter((u) => matchesGroup(u.name, group)),
  }));

  const matchedIds = new Set(
    categorized.flatMap((c) => c.universities.map((u) => u.id))
  );
  const others = universities.filter((u) => !matchedIds.has(u.id));

  let cardIndex = 0; // global index so stagger animation flows across all sections

  const renderCard = (university: (typeof universities)[number], accentColor?: string) => {
    const index = cardIndex++;
    const isPressed = pressedId === university.id;

    return (
      <Link
        key={university.id}
        href={`/member-dashboard/sales/${university.id}`}
        onPointerDown={() => setPressedId(university.id)}
        onPointerUp={() => setPressedId(null)}
        onPointerLeave={() => setPressedId(null)}
        className={`group relative flex flex-col items-center overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 sm:p-5 text-center shadow-sm will-change-transform hover:shadow-lg hover:border-brand-300 active:shadow-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/50 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        } ${isPressed ? "scale-95" : "scale-100"}`}
        style={{
          transitionDelay: mounted ? "0ms" : `${index * 40}ms`,
          transitionProperty: "transform, box-shadow, border-color, opacity",
          transitionDuration: isPressed ? "120ms" : "250ms",
          transitionTimingFunction: "ease-out",
        }}
      >
        {/* Accent bar reflecting the group's product color */}
        {accentColor && (
          <span
            className="absolute inset-x-0 top-0 h-1"
            style={{ backgroundColor: accentColor }}
          />
        )}

        {/* Logo */}
        <div className="relative h-12 w-12 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800 mt-1">
          {university.logo ? (
            <Image
              src={university.logo}
              alt={university.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl sm:text-2xl">
              🎓
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="mt-2 sm:mt-3 line-clamp-2 text-[11px] sm:text-base font-semibold leading-tight text-gray-800 dark:text-white group-hover:text-brand-500 transition-colors">
          {university.name}
        </h3>

        {/* Location — hidden on very small screens to stay clean */}
        <p className="mt-0.5 sm:mt-1 hidden sm:block truncate w-full text-sm text-gray-500 dark:text-gray-400">
          {university.location}
        </p>
      </Link>
    );
  };

  const hasAnyUniversities = universities.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white/90">
          Sales
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Browse universities and their available opportunities for sales conversations.
        </p>
      </div>

      {/* Grouped sections */}
      {categorized.map(({ group, universities: groupUniversities }) => {
        if (groupUniversities.length === 0) return null;
        const primaryColor = group.tags[0]?.color;

        return (
          <div key={group.id} className="space-y-3">
            {/* Big title: product logo + colored label */}
            <div className="flex flex-wrap items-center gap-4">
              {group.tags.length > 0 ? (
                group.tags.map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <div className="relative h-9 w-9 sm:h-11 sm:w-11 shrink-0">
                      <Image
                        src={t.logo}
                        alt={t.label}
                        fill
                        className="object-contain"
                        sizes="44px"
                      />
                    </div>
                    <span
                      className="text-lg sm:text-2xl font-extrabold tracking-wide"
                      style={{ color: t.color }}
                    >
                      {t.label}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-lg sm:text-2xl font-extrabold tracking-wide text-gray-600 dark:text-gray-300">
                  {group.title}
                </span>
              )}
              {group.subtitle && (
                <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  {group.subtitle}
                </span>
              )}
            </div>

            {/* Cards for this group */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              {groupUniversities.map((university) => renderCard(university, primaryColor))}
            </div>
          </div>
        );
      })}

      {/* Ungrouped / other universities */}
      {others.length > 0 && (
        <div className="space-y-3">
          <span className="text-lg sm:text-2xl font-extrabold tracking-wide text-gray-500 dark:text-gray-400">
            Other Universities
          </span>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {others.map((university) => renderCard(university))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasAnyUniversities && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-12 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="text-4xl mb-3">🎓</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No universities available yet.
          </p>
        </div>
      )}
    </div>
  );
}
