import GridShape from "@/components/common/GridShape";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden z-1 bg-white dark:bg-gray-900">
      <GridShape />
      <div className="mx-auto w-full max-w-[500px] text-center">
        {/* 404 Text */}
        <h1 className="mb-4 font-bold text-gray-800 text-8xl dark:text-white/90">
          404
        </h1>

        {/* Error Image */}
        <div className="my-8 flex justify-center">
          <Image
            src="/images/error/erreur-page.jpg"
            alt="Error"
            width={400}
            height={300}
            className="rounded-lg"
          />
        </div>

        {/* Page Not Found Text */}
        <h2 className="mb-4 text-2xl font-semibold text-gray-800 dark:text-white">
          Page Not Found
        </h2>

        <p className="mb-8 text-base text-gray-600 dark:text-gray-400">
          The page you are looking for doesn't exist or has been moved.
        </p>

        {/* Back to Home Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-8 py-3.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
      
      {/* Footer */}
      <p className="absolute text-sm text-center text-gray-500 -translate-x-1/2 bottom-6 left-1/2 dark:text-gray-400">
        &copy; {new Date().getFullYear()} - AIESEC Dashboard
      </p>
    </div>
  );
}
