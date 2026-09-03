"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { PlusIcon, PencilIcon, TrashBinIcon, CloseIcon } from "@/icons/index";
import { getUniversities, getOpportunities, type Opportunity } from "@/lib/dataUtils";

type OpportunityDraft = {
  expaOpportunityId: string;
  product: string;
  title: string;
  organisation: string;
  location: string;
  country: string;
  description: string;
  duration: string;
  date: string;
  salary: string;
  workHours: string;
  expectedWorkSchedule: string;
  accommodation: string;
  food: string;
  transportation: string;
  computer: string;
  benefitsText: string;
  requirementsText: string;
  skillsText: string;
  responsibilitiesText: string;
  learningPointsText: string;
};

const STORAGE_KEY = "opportunities";

const PRODUCT_OPTIONS = [
  { value: "GTa", label: "GTa" },
  { value: "GTe", label: "GTe" },
  { value: "GV", label: "GV" },
];

function listToText(items?: string[]) {
  return (items ?? []).join("\n");
}

function textToList(text: string) {
  return text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyDraft(): OpportunityDraft {
  return {
    expaOpportunityId: "",
    product: "",
    title: "",
    organisation: "",
    location: "",
    country: "",
    description: "",
    duration: "",
    date: "",
    salary: "",
    workHours: "",
    expectedWorkSchedule: "",
    accommodation: "",
    food: "",
    transportation: "",
    computer: "",
    benefitsText: "",
    requirementsText: "",
    skillsText: "",
    responsibilitiesText: "",
    learningPointsText: "",
  };
}

function opportunityToDraft(opportunity: Opportunity): OpportunityDraft {
  return {
    expaOpportunityId: opportunity.expaOpportunityId ?? "",
    product: opportunity.product ?? "",
    title: opportunity.title ?? "",
    organisation: opportunity.organisation ?? "",
    location: opportunity.location ?? "",
    country: opportunity.country ?? "",
    description: opportunity.description ?? "",
    duration: opportunity.duration ?? "",
    date: opportunity.date ?? "",
    salary: opportunity.salary ?? "",
    workHours: opportunity.workHours ?? "",
    expectedWorkSchedule: opportunity.expectedWorkSchedule ?? "",
    accommodation: opportunity.accommodation ?? "",
    food: opportunity.food ?? "",
    transportation: opportunity.transportation ?? "",
    computer: opportunity.computer ?? "",
    benefitsText: listToText(opportunity.benefits),
    requirementsText: listToText(opportunity.requirements),
    skillsText: listToText(opportunity.skills),
    responsibilitiesText: listToText(opportunity.responsibilities),
    learningPointsText: listToText(opportunity.learningPoints),
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
    product: draft.product.trim() || undefined,
    title: draft.title.trim(),
    organisation: draft.organisation.trim() || undefined,
    location: draft.location.trim() || undefined,
    country: draft.country.trim(),
    description: draft.description.trim() || undefined,
    duration: draft.duration.trim(),
    date: draft.date.trim(),
    salary: draft.salary.trim() || undefined,
    workHours: draft.workHours.trim() || undefined,
    expectedWorkSchedule: draft.expectedWorkSchedule.trim() || undefined,
    accommodation: draft.accommodation.trim() || undefined,
    food: draft.food.trim() || undefined,
    transportation: draft.transportation.trim() || undefined,
    computer: draft.computer.trim() || undefined,
    benefits: textToList(draft.benefitsText),
    requirements: textToList(draft.requirementsText),
    skills: textToList(draft.skillsText),
    responsibilities: textToList(draft.responsibilitiesText),
    learningPoints: textToList(draft.learningPointsText),
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

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
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
        if (response.status === 400) {
          throw new Error("Invalid Opportunity ID. Please check the ID and try again.");
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error("Could not fetch this EXPA opportunity. Please check the admin configuration and try again.");
        }
        if (response.status === 429) {
          throw new Error("EXPA rate limit reached. Please wait a moment and try again.");
        }
        throw new Error(result?.error ?? "Could not fetch this EXPA opportunity. Please check the Opportunity ID and try again.");
      }

      const opportunity = result.opportunity as Opportunity;
      const existingProduct = formData.product || editingOpportunity?.product || "";

      setFormData({
        ...opportunityToDraft(opportunity),
        product: existingProduct,
        expaOpportunityId: id,
      });
      setFetchSuccess("Opportunity loaded from EXPA. Review and edit the fields below before saving.");
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Could not fetch this EXPA opportunity.");
    } finally {
      setIsFetchingExpa(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedUniversity) {
      setFormError("Please select a university first.");
      return;
    }

    if (!formData.product.trim()) {
      setFormError("Please select a product for this opportunity.");
      return;
    }

    if (!formData.title.trim()) {
      setFormError("Opportunity title is required.");
      return;
    }

    const nextOpportunity = draftToOpportunity(formData, selectedUniversity, editingOpportunity?.id);

    setOpportunities((current) => {
      if (editingOpportunity) {
        return current.map((opp) => (opp.id === editingOpportunity.id ? nextOpportunity : opp));
      }

      return [...current, nextOpportunity];
    });

    resetModalState();
  }

  function handleDelete(opportunityId: string) {
    if (!confirm("Are you sure you want to delete this opportunity?")) return;
    setOpportunities((current) => current.filter((opp) => opp.id !== opportunityId));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Create Opps for Universities
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage opportunities for universities. Changes will reflect in the Member Dashboard Resources page.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select University
        </label>
        <select
          value={selectedUniversity}
          onChange={(e) => setSelectedUniversity(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">-- Select a university --</option>
          {universities.map((uni) => (
            <option key={uni.id} value={uni.id}>
              {uni.name}
            </option>
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
                        <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                          {opportunity.title}
                        </h3>
                        {opportunity.product && (
                          <Badge size="sm" color="info">
                            {opportunity.product}
                          </Badge>
                        )}
                        {opportunity.expaOpportunityId && (
                          <Badge size="sm" color="success">
                            EXPA #{opportunity.expaOpportunityId}
                          </Badge>
                        )}
                      </div>

                      <div className="mb-3 flex flex-wrap gap-2">
                        {opportunity.organisation && (
                          <Badge size="sm" color="info">
                            {opportunity.organisation}
                          </Badge>
                        )}
                        {opportunity.country && (
                          <Badge size="sm" color="success">
                            {opportunity.country}
                          </Badge>
                        )}
                        {opportunity.location && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {opportunity.location}
                          </span>
                        )}
                      </div>

                      {opportunity.description && (
                        <p className="mb-3 line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
                          {opportunity.description}
                        </p>
                      )}

                      <div className="grid gap-2 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2">
                        <p><span className="font-medium">Working hours:</span> {opportunity.workHours || "—"}</p>
                        <p><span className="font-medium">Salary:</span> {opportunity.salary || "—"}</p>
                        <p><span className="font-medium">Accommodation:</span> {opportunity.accommodation || "—"}</p>
                        <p><span className="font-medium">Food:</span> {opportunity.food || "—"}</p>
                        <p><span className="font-medium">Transportation:</span> {opportunity.transportation || "—"}</p>
                        <p><span className="font-medium">Computer:</span> {opportunity.computer || "—"}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openModal(opportunity)}
                        className="rounded-lg border border-gray-300 p-2 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        title="Edit"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(opportunity.id)}
                        className="rounded-lg border border-red-300 p-2 text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        title="Delete"
                      >
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
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                No opportunities for this university yet.
              </p>
              <Button size="sm" onClick={() => openModal()}>
                <PlusIcon />
                Add First Opportunity
              </Button>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {editingOpportunity ? "Edit Opportunity" : "Add New Opportunity"}
              </h2>
              <button
                onClick={resetModalState}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                EXPA Opportunity ID
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={expaOpportunityId}
                  onChange={(e) => setExpaOpportunityId(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  placeholder="1335616"
                />
                <button
                  type="button"
                  onClick={handleFetchFromExpa}
                  disabled={isFetchingExpa}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isFetchingExpa ? "Fetching opportunity..." : "Fetch from EXPA"}
                </button>
              </div>
              {fetchSuccess && (
                <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
                  {fetchSuccess}
                </p>
              )}
              {fetchError && (
                <p className="mt-3 text-sm text-error-600 dark:text-error-400">
                  {fetchError}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Product *</label>
                  <select
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    required
                  >
                    <option value="">-- Select product --</option>
                    {PRODUCT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Organisation</label>
                  <input
                    type="text"
                    value={formData.organisation}
                    onChange={(e) => setFormData({ ...formData, organisation: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Country *</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Duration *</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 12 weeks"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">EXPA Opportunity ID</label>
                  <input
                    type="text"
                    value={formData.expaOpportunityId}
                    onChange={(e) => setFormData({ ...formData, expaOpportunityId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Salary</label>
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Working Hours</label>
                  <input
                    type="text"
                    value={formData.workHours}
                    onChange={(e) => setFormData({ ...formData, workHours: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Expected Work Schedule</label>
                <input
                  type="text"
                  value={formData.expectedWorkSchedule}
                  onChange={(e) => setFormData({ ...formData, expectedWorkSchedule: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Accommodation</label>
                  <input
                    type="text"
                    value={formData.accommodation}
                    onChange={(e) => setFormData({ ...formData, accommodation: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Food</label>
                  <input
                    type="text"
                    value={formData.food}
                    onChange={(e) => setFormData({ ...formData, food: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Transportation</label>
                  <input
                    type="text"
                    value={formData.transportation}
                    onChange={(e) => setFormData({ ...formData, transportation: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Computer</label>
                  <input
                    type="text"
                    value={formData.computer}
                    onChange={(e) => setFormData({ ...formData, computer: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Skills</label>
                  <textarea
                    value={formData.skillsText}
                    onChange={(e) => setFormData({ ...formData, skillsText: e.target.value })}
                    rows={4}
                    placeholder="One skill per line"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Learning Points</label>
                  <textarea
                    value={formData.learningPointsText}
                    onChange={(e) => setFormData({ ...formData, learningPointsText: e.target.value })}
                    rows={4}
                    placeholder="One learning point per line"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Responsibilities</label>
                  <textarea
                    value={formData.responsibilitiesText}
                    onChange={(e) => setFormData({ ...formData, responsibilitiesText: e.target.value })}
                    rows={4}
                    placeholder="One responsibility per line"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Benefits</label>
                  <textarea
                    value={formData.benefitsText}
                    onChange={(e) => setFormData({ ...formData, benefitsText: e.target.value })}
                    rows={4}
                    placeholder="One benefit per line"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Requirements</label>
                <textarea
                  value={formData.requirementsText}
                  onChange={(e) => setFormData({ ...formData, requirementsText: e.target.value })}
                  rows={4}
                  placeholder="One requirement per line"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />
              </div>

              {formError && (
                <p className="text-sm text-error-600 dark:text-error-400">{formError}</p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button variant="outline" onClick={resetModalState}>
                  Cancel
                </Button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:bg-brand-300"
                >
                  {editingOpportunity ? "Update Opportunity" : "Create Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}