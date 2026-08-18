"use client";

import Link from "next/link";
import { getUniversityById, getOpportunitiesByUniversityId } from "@/lib/dataUtils";
import { useEffect, useState, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";

const PRODUCT_COLORS: Record<string, string> = {
  GTa: "#0CB9C1",
  GTe: "#F48924",
  GV: "#F85A40",
};

// Same logo files already placed in /public/images/products/
const PRODUCT_LOGOS: Record<string, string> = {
  GTa: "/images/products/gta.png",
  GTe: "/images/products/gte.png",
  GV: "/images/products/gv.png",
};

function getProductColor(product?: string) {
  return PRODUCT_COLORS[product ?? ""] ?? "#9CA3AF"; // gray-400 fallback
}

function getProductLogo(product?: string) {
  return PRODUCT_LOGOS[product ?? ""];
}

export default function UniversityDetailsClient({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const university = getUniversityById(id);
  const opportunities = getOpportunitiesByUniversityId(id);
  const [mounted, setMounted] = useState(false);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [epName, setEpName] = useState("");
  const [note, setNote] = useState("");

  const handleFillForm = (opportunity: any) => {
    setSelectedOpportunity(opportunity);
    setShowFormModal(true);
  };

  const handleSubmitForm = () => {
    // Handle form submission logic here
    console.log("Form submitted:", { epName, note, opportunity: selectedOpportunity });
    setShowFormModal(false);
    setEpName("");
    setNote("");
    setSelectedOpportunity(null);
  };

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  if (!university) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-16 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          University not found
        </p>
        <Link
          href="/member-dashboard/sales"
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          ← Back to Sales
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/member-dashboard/sales"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
      >
        <span>←</span>
        <span>Back to Sales</span>
      </Link>

      {/* University Header */}
      <div className={`transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800 shadow-sm">
            {university.logo ? (
              <Image
                src={university.logo}
                alt={university.name}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl">
                🎓
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-white/90">
              {university.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Badge size="sm" color="info">
                {university.country}
              </Badge>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {university.location}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* General Information */}
      <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] transition-all duration-500 ease-out ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`} style={{ transitionDelay: "100ms" }}>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
          General Information
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {university.generalInfo}
        </p>
      </div>

      {/* Sales Speech */}
      <div className={`rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm dark:border-brand-800/50 dark:from-brand-900/20 dark:to-white/[0.03] transition-all duration-500 ease-out ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`} style={{ transitionDelay: "200ms" }}>
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            💬
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Sales Speech
          </h2>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-11">
          {university.salesSpeech}
        </p>
      </div>

      {/* Current Opportunities */}
      <div className={`transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "300ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Current Opportunities
          </h2>
          {/* Legend — now with real logos */}
          <div className="hidden sm:flex items-center gap-4">
            {Object.entries(PRODUCT_COLORS).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="relative h-4 w-4 shrink-0">
                  <Image src={PRODUCT_LOGOS[label]} alt={label} fill className="object-contain" sizes="16px" />
                </div>
                <span className="text-xs font-medium" style={{ color }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {opportunities.length > 0 ? (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {opportunities.map((opportunity, index) => {
              const product = (opportunity as any).product as string | undefined;
              const color = getProductColor(product);
              const logo = getProductLogo(product);
              const isExpanded = expandedId === opportunity.id;
              const isPressed = pressedId === opportunity.id;

              return (
                <div
                  key={opportunity.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : opportunity.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedId(isExpanded ? null : opportunity.id);
                    }
                  }}
                  onPointerDown={() => setPressedId(opportunity.id)}
                  onPointerUp={() => setPressedId(null)}
                  onPointerLeave={() => setPressedId(null)}
                  className={`group relative col-span-1 cursor-pointer overflow-hidden rounded-2xl border bg-white p-3 sm:p-4 shadow-sm will-change-transform dark:bg-white/[0.03] ${
                    isExpanded ? "col-span-3" : ""
                  } ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${
                    isPressed ? "scale-95" : "scale-100"
                  }`}
                  style={{
                    borderColor: isExpanded ? color : "rgb(229 231 235)",
                    transitionProperty: "transform, box-shadow, border-color, opacity, grid-column",
                    transitionDuration: isPressed ? "120ms" : "300ms",
                    transitionTimingFunction: "ease-out",
                    transitionDelay: mounted ? "0ms" : `${400 + index * 50}ms`,
                    boxShadow: isExpanded ? `0 4px 20px -4px ${color}40` : undefined,
                  }}
                >
                  {/* Top accent bar in product color */}
                  <span
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ backgroundColor: color }}
                  />

                  {/* Product badge — logo + label, colored */}
                  <div
                    className="mt-1 inline-flex items-center gap-1.5 rounded-full py-0.5 pl-1 pr-2.5 text-[10px] sm:text-xs font-semibold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {logo && (
                      <span className="relative h-4 w-4 sm:h-5 sm:w-5 shrink-0 rounded-full bg-white/90 overflow-hidden">
                        <Image src={logo} alt={product ?? "product"} fill className="object-contain p-0.5" sizes="20px" />
                      </span>
                    )}
                    <span>{product ?? "—"}</span>
                  </div>

                  {/* Title */}
                  <h3 className={`mt-2 line-clamp-2 font-semibold leading-tight text-gray-800 dark:text-white transition-colors ${
                    isExpanded ? "text-lg sm:text-xl" : "text-[11px] sm:text-base"
                  }`}>
                    {opportunity.title}
                  </h3>

                  {/* Quick facts — compact icon row */}
                  <div className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-500 dark:text-gray-400 ${
                    isExpanded ? "text-sm sm:text-base" : "text-[10px] sm:text-xs"
                  }`}>
                    <span className="inline-flex items-center gap-1">
                      ⏱️ {opportunity.duration}
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1">
                      📅 {opportunity.date}
                    </span>
                  </div>

                  {/* Expand toggle indicator */}
                  <div className="mt-2 flex items-center justify-center sm:justify-start">
                    <span
                      className="text-gray-400 transition-transform duration-300 ease-out dark:text-gray-500"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      ▾
                    </span>
                  </div>

                  {/* Expanded details — smooth height animation */}
                  <div
                    className="grid transition-all duration-300 ease-out"
                    style={{
                      gridTemplateRows: isExpanded ? "1fr" : "0fr",
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                        <div className={`flex items-center gap-2 text-gray-600 dark:text-gray-400 sm:col-span-2 ${
                          isExpanded ? "text-base sm:text-lg" : "text-xs"
                        }`}>
                          🌍 {opportunity.country}
                        </div>

                        {/* Benefits */}
                        <div>
                          <p className={`font-medium text-gray-500 dark:text-gray-400 mb-2 ${
                            isExpanded ? "text-sm sm:text-base" : "text-xs"
                          }`}>
                            Benefits
                          </p>
                          <ul className="space-y-1">
                            {opportunity.benefits.map((benefit, idx) => (
                              <li key={idx} className={`text-gray-600 dark:text-gray-400 flex items-start gap-2 ${
                                isExpanded ? "text-sm sm:text-base" : "text-xs"
                              }`}>
                                <span className="text-green-500 mt-0.5">✓</span>
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Requirements */}
                        <div>
                          <p className={`font-medium text-gray-500 dark:text-gray-400 mb-2 ${
                            isExpanded ? "text-sm sm:text-base" : "text-xs"
                          }`}>
                            Requirements
                          </p>
                          <ul className="space-y-1">
                            {opportunity.requirements.map((requirement, idx) => (
                              <li key={idx} className={`text-gray-600 dark:text-gray-400 flex items-start gap-2 ${
                                isExpanded ? "text-sm sm:text-base" : "text-xs"
                              }`}>
                                <span className="mt-0.5" style={{ color }}>•</span>
                                <span>{requirement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Fill Form Button */}
                        <div className="sm:col-span-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFillForm(opportunity);
                            }}
                            className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 active:scale-[0.98]"
                          >
                            Fill Form
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-12 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="text-4xl mb-3">💼</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No opportunities available for this university yet.
            </p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Fill Form
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  EP Name
                </label>
                <input
                  type="text"
                  value={epName}
                  onChange={(e) => setEpName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter EP name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Enter a note"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowFormModal(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitForm}
                className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
