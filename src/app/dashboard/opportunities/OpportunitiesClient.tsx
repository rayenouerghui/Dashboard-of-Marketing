"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { PlusIcon, PencilIcon, TrashBinIcon, CloseIcon } from "@/icons/index";
import { getUniversities, getOpportunities, type Opportunity } from "@/lib/dataUtils";

// ─── Opportunity type → color mapping ────────────────────────────────────────
const OPPORTUNITY_TYPE_CONFIG = {
  professional: {
    label: "Professional",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  teaching: {
    label: "Teaching",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  volunteering: {
    label: "Volunteering",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
} as const;

type OpportunityType = keyof typeof OPPORTUNITY_TYPE_CONFIG;

function OpportunityTypeBadge({ type }: { type: OpportunityType | undefined }) {
  if (!type) return null;
  const config = OPPORTUNITY_TYPE_CONFIG[type];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

// ─── Stripped-down draft — only fields we actually use ────────────────────────
type OpportunityDraft = {
  expaOpportunityId: string; // internal only, not shown in form
  opportunityType: OpportunityType | "";
  product: string;
  title: string;
  organisation: string;
  location: string;
  country: string;
  description: string;
  duration: string; // "Short" | "Mid" | "Long"
  salary: string;
  accommodation: string;
  food: string;
  transportation: string;
  computer: string;
};

const STORAGE_KEY = "opportunities";

const PRODUCT_OPTIONS = [
  { value: "GTa", label: "GTa" },
  { value: "GTe", label: "GTe" },
  { value: "GV", label: "GV" },
];

const DURATION_OPTIONS = [
  { value: "Short", label: "Short" },
  { value: "Mid",   label: "Mid"   },
  { value: "Long",  label: "Long"  },
];

function emptyDraft(): OpportunityDraft {
  return {
    expaOpportunityId: "",
    opportunityType: "",
    product: "",
    title: "",
    organisation: "",
    location: "",
    country: "",
    description: "",
    duration: "Mid",
    salary: "",
    accommodation: "",
    food: "",
    transportation: "",
    computer: "",
  };
}

function opportunityToDraft(opportunity: Opportunity): OpportunityDraft {
  return {
    expaOpportunityId: opportunity.expaOpportunityId ?? "",
    opportunityType: (opportunity.opportunityType as OpportunityType) ?? "",
    product: opportunity.product ?? "",
    title: opportunity.title ?? "",
    organisation: opportunity.organisation ?? "",
    location: opportunity.location ?? "",
    country: opportunity.country ?? "",
    description: opportunity.description ?? "",
    duration: opportunity.duration || "Mid",
    salary: opportunity.salary ?? "",
    accommodation: opportunity.accommodation ?? "",
    food: opportunity.food ?? "",
    transportation: opportunity.transportation ?? "",
    computer: opportunity.computer ?? "",
  };
}

function draftToOpportunity(
  draft: OpportunityDraft,
  universityId: string,
  existingId?: string
): Opportunity {
  return {
    id: existingId ?? `opp-${Date.now()}`,
    universityId,
    expaOpportunityId: draft.expaOpportunityId.trim() || undefined,
    opportunityType: draft.opportunityType || undefined,
    product: draft.product.trim() || undefined,
    title: draft.title.trim(),
    organisation: draft.organisation.trim() || undefined,
    location: draft.location.trim() || undefined,
    country: draft.country.trim(),
    description: draft.description.trim() || undefined,
    duration: draft.duration,
    date: "",
    salary: draft.salary.trim() || undefined,
    accommodation: draft.accommodation.trim() || undefined,
    food: draft.food.trim() || undefined,
    transportation: draft.transportation.trim() || undefined,
    computer: draft.computer.trim() || undefined,
    benefits: [],
    requirements: [],
  };
}

function readStoredOpportunities() {
  if (typeof window === "undefined") return [] as Opportunity[];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as Opportunity[];
    } catch {
      return getOpportunities();
    }
  }
  return getOpportunities();
}

export default function OpportunitiesClient() {
  const universities = getUniversities();
  const [selectedUniversity, setSelectedUniversity] = useState<string>("");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isFetchingExpa, setIsFetchingExpa] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [expaOpportunityId, setExpaOpportunityId] = useState("");
  const [formData, setFormData] = useState<OpportunityDraft>(emptyDraft());

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    setOpportunities(readStoredOpportunities());
  }, []);

  useEffect(() => {
    if (opportunities.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(opportunities));
    }
  }, [opportunities]);

  const filteredOpportunities = useMemo(
    () => (selectedUniversity ? opportunities.filter((opp) => opp.universityId === selectedUniversity) : []),
    [opportunities, selectedUniversity]
  );

  function resetModalState() {
    setIsModalOpen(false);
    setEditingOpportunity(null);
    setFormData(emptyDraft());
    setExpaOpportunityId("");
    setFetchError(null);
    setFetchSuccess(null);
    setFormError(null);
    setIsFetchingExpa(false);
    setIsSubmitting(false);
  }

  function openModal(opportunity?: Opportunity) {
    if (opportunity) {
      setEditingOpportunity(opportunity);
      setFormData(opportunityToDraft(opportunity));
      setExpaOpportunityId(opportunity.expaOpportunityId ?? "");
    } else {
      setEditingOpportunity(null);
      setFormData(emptyDraft());
      setExpaOpportunityId("");
    }
    setFetchError(null);
    setFetchSuccess(null);
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleFetchFromExpa() {
    const id = expaOpportunityId.trim();
    if (!id) {
      setFetchError("Enter an EXPA Opportunity ID first.");
      return;
    }
    setIsFetchingExpa(true);
    setFetchError(null);
    setFetchSuccess(null);
    try {
      const response = await fetch(`/api/expa/opportunities/${encodeURIComponent(id)}`);
      const result = await response.json();
      if (!response.ok || !result?.success) {
        if (response.status === 400) throw new Error("Invalid Opportunity ID. Please check the ID and try again.");
        if (response.status === 401 || response.status === 403) throw new Error("Could not fetch this EXPA opportunity. Check admin configuration.");
        if (response.status === 429) throw new Error("EXPA rate limit reached. Please wait a moment and try again.");
        throw new Error(result?.error ?? "Could not fetch this EXPA opportunity.");
      }
      const opportunity = result.opportunity as Opportunity;
      setFormData({
        ...opportunityToDraft(opportunity),
        expaOpportunityId: id,
      });
      setFetchSuccess("Opportunity loaded from EXPA. Review and edit the fields below before saving.");
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Could not fetch this EXPA opportunity.");
    } finally {
      setIsFetchingExpa(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUniversity) { setFormError("Please select a university first."); return; }
    if (!formData.product.trim()) { setFormError("Please select a product for this opportunity."); return; }
    if (!formData.title.trim()) { setFormError("Opportunity title is required."); return; }

    setIsSubmitting(true);
    setFormError(null);

    const nextOpportunity = draftToOpportunity(formData, selectedUniversity, editingOpportunity?.id);
    setOpportunities((current) => {
      if (editingOpportunity) return current.map((opp) => (opp.id === editingOpportunity.id ? nextOpportunity : opp));
      return [...current, nextOpportunity];
    });

    try {
      const university = universities.find((u) => u.id === selectedUniversity);
      const response = await fetch("/api/opportunities/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product:         formData.product.trim(),
          opportunityId:   formData.expaOpportunityId.trim(),
          title:           formData.title.trim(),
          universityId:    selectedUniversity,
          universityName:  university?.name ?? selectedUniversity,
          country:         formData.country.trim(),
          duration:        formData.duration,
          opportunityDate: "",
          epName:          "",
          condition:       "",
          note:            "",
          source:          "Admin Dashboard",
          opportunity:     nextOpportunity,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        setSubmitSuccess(`Opportunity saved locally. Sheet write failed: ${result?.error ?? "unknown error"}`);
      } else {
        const sheetLabel = result.sheetType ? ` to the ${result.sheetType} sheet` : "";
        setSubmitSuccess(`Opportunity saved${sheetLabel}. Members can now see it.`);
      }
    } catch (err) {
      setSubmitSuccess(`Opportunity saved locally. Could not reach the sheet: ${err instanceof Error ? err.message : "network error"}`);
    }

    setIsSubmitting(false);
    resetModalState();
  }

  function handleDelete(opportunityId: string) {
    if (!confirm("Are you sure you want to delete this opportunity?")) return;
    setOpportunities((current) => current.filter((opp) => opp.id !== opportunityId));
  }

  const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Create Opps for Universities</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage opportunities for universities. Changes will reflect in the Member Dashboard.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Select University</label>
        <select
          value={selectedUniversity}
          onChange={(e) => setSelectedUniversity(e.target.value)}
          className={inputCls}
        >
          <option value="">-- Select a university --</option>
          {universities.map((uni) => (
            <option key={uni.id} value={uni.id}>{uni.name}</option>
          ))}
        </select>
      </div>

      {selectedUniversity && (
        <div className={`transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Opportunities</h2>
            <Button size="sm" onClick={() => openModal()}>
              <PlusIcon />
              Add Opportunity
            </Button>
          </div>

          {submitSuccess && (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              submitSuccess.includes("failed") || submitSuccess.includes("Could not")
                ? "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
                : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
            }`}>
              {submitSuccess}
              <button onClick={() => setSubmitSuccess(null)} className="ml-3 font-medium underline opacity-70 hover:opacity-100">
                Dismiss
              </button>
            </div>
          )}

          {filteredOpportunities.length > 0 ? (
            <div className="space-y-3">
              {filteredOpportunities.map((opportunity, index) => (
                <div
                  key={opportunity.id}
                  className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-white">{opportunity.title}</h3>
                        <OpportunityTypeBadge type={opportunity.opportunityType as OpportunityType | undefined} />
                        {opportunity.product && <Badge size="sm" color="info">{opportunity.product}</Badge>}
                        {opportunity.duration && <Badge size="sm" color="warning">{opportunity.duration}</Badge>}
                      </div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        {opportunity.organisation && <Badge size="sm" color="info">{opportunity.organisation}</Badge>}
                        {opportunity.country && <Badge size="sm" color="success">{opportunity.country}</Badge>}
                        {opportunity.location && <span className="text-xs text-gray-500 dark:text-gray-400">{opportunity.location}</span>}
                      </div>
                      <div className="grid gap-1 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2">
                        <p><span className="font-medium">Salary:</span> {opportunity.salary || "—"}</p>
                        <p><span className="font-medium">Accommodation:</span> {opportunity.accommodation || "—"}</p>
                        <p><span className="font-medium">Food:</span> {opportunity.food || "—"}</p>
                        <p><span className="font-medium">Transportation:</span> {opportunity.transportation || "—"}</p>
                        <p><span className="font-medium">Computer:</span> {opportunity.computer || "—"}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => openModal(opportunity)} className="rounded-lg border border-gray-300 p-2 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800" title="Edit">
                        <PencilIcon />
                      </button>
                      <button onClick={() => handleDelete(opportunity.id)} className="rounded-lg border border-red-300 p-2 text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20" title="Delete">
                        <TrashBinIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-12 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="mb-3 text-4xl">💼</div>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">No opportunities for this university yet.</p>
              <Button size="sm" onClick={() => openModal()}><PlusIcon />Add First Opportunity</Button>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {editingOpportunity ? "Edit Opportunity" : "Add New Opportunity"}
              </h2>
              <button onClick={resetModalState} className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                <CloseIcon />
              </button>
            </div>

            {/* EXPA Fetch Widget */}
            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fetch from EXPA by Opportunity ID
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={expaOpportunityId}
                  onChange={(e) => setExpaOpportunityId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleFetchFromExpa())}
                  className={`flex-1 ${inputCls}`}
                  placeholder="e.g. 1329526"
                />
                <button
                  type="button"
                  onClick={handleFetchFromExpa}
                  disabled={isFetchingExpa}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isFetchingExpa ? "Fetching…" : "Fetch from EXPA"}
                </button>
              </div>
              {fetchSuccess && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{fetchSuccess}</p>}
              {fetchError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{fetchError}</p>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title + Product */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputCls} required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Product *
                    {formData.opportunityType && <span className="ml-2"><OpportunityTypeBadge type={formData.opportunityType as OpportunityType} /></span>}
                  </label>
                  <select value={formData.product} onChange={(e) => setFormData({ ...formData, product: e.target.value })} className={inputCls} required>
                    <option value="">-- Select product --</option>
                    {PRODUCT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Organisation + Country */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Organisation</label>
                  <input type="text" value={formData.organisation} onChange={(e) => setFormData({ ...formData, organisation: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Country *</label>
                  <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className={inputCls} required />
                </div>
              </div>

              {/* Location + Duration */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Duration *</label>
                  <select value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className={inputCls} required>
                    {DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} className={inputCls} />
              </div>

              {/* Salary */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Salary</label>
                <input type="text" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} className={inputCls} />
              </div>

              {/* Logistics */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Accommodation</label>
                  <input type="text" value={formData.accommodation} onChange={(e) => setFormData({ ...formData, accommodation: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Food</label>
                  <input type="text" value={formData.food} onChange={(e) => setFormData({ ...formData, food: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Transportation</label>
                  <input type="text" value={formData.transportation} onChange={(e) => setFormData({ ...formData, transportation: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Computer</label>
                  <input type="text" value={formData.computer} onChange={(e) => setFormData({ ...formData, computer: e.target.value })} className={inputCls} />
                </div>
              </div>

              {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
                <Button variant="outline" onClick={resetModalState}>Cancel</Button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {isSubmitting ? "Saving…" : editingOpportunity ? "Update Opportunity" : "Create Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
