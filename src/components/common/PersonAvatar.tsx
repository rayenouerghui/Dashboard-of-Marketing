"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { getPersonPhotoPath } from "@/data/personPhotos";

const ANIMAL_FALLBACKS = ["🦊", "🐼", "🦁", "🐨", "🐯", "🐰", "🦉", "🐺", "🐸", "🐻"];

function getAnimalFallback(name: string): string {
  const value = name.trim();
  if (!value) return "🐾";

  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % ANIMAL_FALLBACKS.length;
  }

  return ANIMAL_FALLBACKS[hash];
}

interface PersonAvatarProps {
  name: string;
  className?: string;
}

export default function PersonAvatar({ name, className = "" }: PersonAvatarProps) {
  const [failed, setFailed] = useState(false);
  const photoPath = useMemo(() => getPersonPhotoPath(name), [name]);
  const fallbackAnimal = useMemo(() => getAnimalFallback(name), [name]);

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
        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-lg dark:bg-gray-800">
          <span aria-hidden="true">{fallbackAnimal}</span>
        </div>
      )}
    </div>
  );
}