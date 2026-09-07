"use client";

import React, { useState, useEffect } from "react";
import type { Resource } from "@/lib/resourcesServer";

export default function ResourcesClient() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "text" as Resource["type"],
    url: "",
    content: "",
    category: "",
    tags: "",
    order: 0,
    imageUrl: "",
  });

  useEffect(() => {
    loadResources();
  }, []);

  async function loadResources() {
    try {
      const res = await fetch("/api/resources");
      const data = await res.json();
      setResources(data);
    } catch (error) {
      console.error("Failed to load resources:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        url: formData.type === "link" || formData.type === "pdf" || formData.type === "image" ? formData.url : undefined,
        content: formData.type === "text" ? formData.content : undefined,
        id: editingResource?.id || crypto.randomUUID(),
        createdAt: editingResource?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await loadResources();
        setShowModal(false);
        resetForm();
      }
    } catch (error) {
      console.error("Failed to save resource:", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    
    try {
      const res = await fetch(`/api/resources?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadResources();
      }
    } catch (error) {
      console.error("Failed to delete resource:", error);
    }
  }

  function resetForm() {
    setFormData({
      title: "",
      description: "",
      type: "text",
      url: "",
      content: "",
      category: "",
      tags: "",
      order: 0,
      imageUrl: "",
    });
    setEditingResource(null);
  }

  function openEditModal(resource: Resource) {
    setEditingResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description,
      type: resource.type,
      url: resource.url || "",
      content: resource.content || "",
      category: (resource as any).category || "",
      tags: (resource as any).tags || "",
      order: (resource as any).order || 0,
      imageUrl: (resource as any).imageUrl || "",
    });
    setShowModal(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
            Resources for Members
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage resources that appear in the member dashboard
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Resource
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                Tags
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {resources.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No resources found. Click "Add Resource" to create one.
                </td>
              </tr>
            ) : (
              resources.map((resource) => (
                <tr key={resource.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {resource.order || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {resource.title}
                    </div>
                    {(resource as any).description && (
                      <div className="max-w-xs truncate text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {(resource as any).description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {(resource as any).category || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                      {resource.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(resource as any).tags?.split(',').map((tag: string, i: number) => (
                        <span key={i} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(resource)}
                        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                        title="Edit"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingResource ? "Edit Resource" : "Add New Resource"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                  placeholder="Enter resource title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Resource["type"] })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="text">Text Content</option>
                  <option value="link">External Link</option>
                  <option value="pdf">PDF Document</option>
                  <option value="image">Image</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Sales, Marketing, Training"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., important, beginner, guide"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Brief description of the resource"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  min="0"
                  placeholder="Lower numbers appear first"
                />
              </div>

              {(formData.type === "link" || formData.type === "pdf" || formData.type === "image") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL *
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required={formData.type === "link" || formData.type === "pdf" || formData.type === "image"}
                    placeholder="https://example.com/resource"
                  />
                </div>
              )}

              {formData.type === "image" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Thumbnail URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                </div>
              )}

              {formData.type === "text" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required={formData.type === "text"}
                    placeholder="Enter the full content here..."
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 py-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                >
                  {editingResource ? "Update Resource" : "Create Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
