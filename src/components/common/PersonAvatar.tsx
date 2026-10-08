"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { getPersonPhotoPath } from "@/data/personPhotos";

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

interface PersonAvatarProps {
  name: string;
  className?: string;
}

export default function PersonAvatar({ name, className = "" }: PersonAvatarProps) {
  const [failed, setFailed] = useState(false);
  const photoPath = useMemo(() => getPersonPhotoPath(name), [name]);
  const initials = useMemo(() => getInitials(name), [name]);

  return (
    <div className={`relative overflow-hidden ${className}`.trim()}>
      {photoPath && !failed ? (
        <Image
          src={photoPath}
          alt={name}
          fill
          sizes="100vw"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-300">
          {initials}
        </div>
      )}
    </div>
  );
}