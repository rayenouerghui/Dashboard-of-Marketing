"use client";

import { useState, useEffect } from "react";
import { getUniversities, getOpportunities, getOpportunitiesByUniversityId, type University, type Opportunity } from "@/lib/dataUtils";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { PlusIcon, PencilIcon, TrashBinIcon, CloseIcon } from "@/icons/index";

export default function OpportunitiesClient() {
  const universities = getUniversities();
  const [selectedUniversity, setSelectedUniversity] = useState<string>("");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [mounted, setMounted] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    duration: "",
    date: "",
    country: "",
    benefits: [] as string[],
    requirements: [] as string[],
  });

  const [benefitInput, setBenefitInput] = useState("");
  const [requirementInput, setRequirementInput] = useState("");

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Load opportunities from localStorage or use initial data
  useEffect(() => {
    const stored = localStorage.getItem("opportunities");
    if (stored) {
      setOpportunities(JSON.parse(stored));
    } else {
      setOpportunities(getOpportunities());
    }
  }, []);

  // Save opportunities to localStorage whenever they change
  useEffect(() => {
    if (opportunities.length > 0) {
      localStorage.setItem("opportunities", JSON.stringify(opportunities));
    }
  }, [opportunities]);

  // Filter opportunities by selected university
  const filteredOpportunities = selectedUniversity
    ? opportunities.filter((opp) => opp.universityId === selectedUniversity)
    : [];

  const handleUniversityChange = (universityId: string) => {
    setSelectedUniversity(universityId);
  };

  const openModal = (opportunity?: Opportunity) => {
    if (opportunity) {
      setEditingOpportunity(opportunity);
      setFormData({
        title: opportunity.title,
        duration: opportunity.duration,
        date: opportunity.date,
        country: opportunity.country,
        benefits: opportunity.benefits,
        requirements: opportunity.requirements,
      });
    } else {
      setEditingOpportunity(null);
      setFormData({
        title: "",
        duration: "",
        date: "",
        country: "",
        benefits: [],
        requirements: [],
      });
    }
    setBenefitInput("");
    setRequirementInput("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOpportunity(null);
    setFormData({
      title: "",
      duration: "",
      date: "",
      country: "",
      benefits: [],
      requirements: [],
    });
    setBenefitInput("");
    setRequirementInput("");
  };

  const addBenefit = () => {
    if (benefitInput.trim()) {
      setFormData({ ...formData, benefits: [...formData.benefits, benefitInput.trim()] });
      setBenefitInput("");
    }
  };

  const removeBenefit = (index: number) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index),
    });
  };

  const addRequirement = () => {
    if (requirementInput.trim()) {
      setFormData({
        ...formData,
        requirements: [...formData.requirements, requirementInput.trim()],
      });
      setRequirementInput("");
    }
  };

  const removeRequirement = (index: number) => {
    setFormData({
      ...formData,
      requirements: formData.requirements.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUniversity) {
      alert("Please select a university first");
      return;
    }

    if (editingOpportunity) {
      // Update existing opportunity
      setOpportunities(
        opportunities.map((opp) =>
          opp.id === editingOpportunity.id
            ? {
                ...opp,
                ...formData,
                universityId: selectedUniversity,
              }
            : opp
        )
      );
    } else {
      // Create new opportunity
      const newOpportunity: Opportunity = {
        id: `opp-${Date.now()}`,
        universityId: selectedUniversity,
        ...formData,
      };
      setOpportunities([...opportunities, newOpportunity]);
    }

    closeModal();
  };

  const handleDelete = (opportunityId: string) => {
    if (confirm("Are you sure you want to delete this opportunity?")) {
      setOpportunities(opportunities.filter((opp) => opp.id !== opportunityId));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Create Opps for Universities
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage opportunities for universities. Changes will reflect in the Member Dashboard Sales page.
        </p>
      </div>

      {/* University Selection */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select University
        </label>
        <select
          value={selectedUniversity}
          onChange={(e) => handleUniversityChange(e.target.value)}
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

      {/* Opportunities List */}
      {selectedUniversity && (
        <div className={`transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Opportunities
            </h2>
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
                  className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] ${
                    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2">
                        {opportunity.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge size="sm" color="info">
                          {opportunity.duration}
                        </Badge>
                        <Badge size="sm" color="success">
                          {opportunity.country}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {opportunity.date}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p className="mb-1">
                          <span className="font-medium">Benefits:</span> {opportunity.benefits.length} items
                        </p>
                        <p>
                          <span className="font-medium">Requirements:</span> {opportunity.requirements.length} items
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openModal(opportunity)}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(opportunity.id)}
                        className="p-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
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
              <div className="text-4xl mb-3">💼</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {editingOpportunity ? "Edit Opportunity" : "Add New Opportunity"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  required
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration *
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g., 12 weeks"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  required
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Country *
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g., Germany"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  required
                />
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Benefits
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addBenefit())}
                    placeholder="Add a benefit"
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                  <Button size="sm" onClick={addBenefit}>
                    Add
                  </Button>
                </div>
                {formData.benefits.length > 0 && (
                  <ul className="space-y-1">
                    {formData.benefits.map((benefit, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        <span>{benefit}</span>
                        <button
                          type="button"
                          onClick={() => removeBenefit(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <CloseIcon />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Requirements
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={requirementInput}
                    onChange={(e) => setRequirementInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addRequirement())}
                    placeholder="Add a requirement"
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                  <Button size="sm" onClick={addRequirement}>
                    Add
                  </Button>
                </div>
                {formData.requirements.length > 0 && (
                  <ul className="space-y-1">
                    {formData.requirements.map((requirement, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        <span>{requirement}</span>
                        <button
                          type="button"
                          onClick={() => removeRequirement(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <CloseIcon />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-5 py-3.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300"
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
