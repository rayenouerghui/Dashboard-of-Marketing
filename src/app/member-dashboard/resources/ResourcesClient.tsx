"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-full">
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={800}
          className="max-w-full max-h-[90vh] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 h-10 w-10 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ProductSection({
  code,
  title,
  subtitle,
  accent,
  images,
}: {
  code: string;
  title: string;
  subtitle: string;
  accent: "teal" | "red";
  images: { src: string; alt: string }[];
}) {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  const badgeClasses =
    accent === "teal"
      ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
      : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300";

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-base font-bold ${badgeClasses}`}
          >
            {code}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
              {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {images.map((img, i) => (
            <button
              key={img.src}
              onClick={() => setLightboxImage(img)}
              className="group block rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 transition-transform active:scale-[0.97] cursor-pointer"
            >
              <div className="relative aspect-square">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                </div>
              </div>
              <div className="px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                Page {i + 1}
              </div>
            </button>
          ))}
        </div>
      </section>
      {lightboxImage && (
        <Lightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  );
}

export default function ResourcesClient() {
  return (
    <div className="max-w-md mx-auto space-y-8 px-4 pb-10 pt-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400 mb-1">
          Program essentials
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Resources
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Everything you need on GTa and GV, in one place.
        </p>
      </div>

      {/* GTa Section */}
      <ProductSection
        code="GTa"
        title="Global Talent"
        subtitle="Professional internships"
        accent="teal"
        images={[
          { src: "/images/resources/GTa 1.jpg", alt: "GTa program information, page 1" },
          { src: "/images/resources/GTa 2.jpg", alt: "GTa program information, page 2" },
        ]}
      />

      {/* GV Section */}
      <ProductSection
        code="GV"
        title="Global Volunteer"
        subtitle="Volunteer projects"
        accent="red"
        images={[
          { src: "/images/resources/GV 1.jpg", alt: "GV program information, page 1" },
          { src: "/images/resources/GV 2.jpg", alt: "GV program information, page 2" },
        ]}
      />

      {/* University Document Link */}
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white mb-3">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Complete university guide
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Profiles, contact details, and partnership info for every university.
        </p>
        <Link
          href="https://drive.google.com/file/u/4/d/1f0ZNypDrjvqFJ2FTOA0lzi_MzaiB1PcU/view"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-brand-500 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 active:scale-[0.98]"
        >
          Open document
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
