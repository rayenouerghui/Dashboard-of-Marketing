"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function LandingPageClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Determine screen size after mount (avoids SSR/hydration mismatch)
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  // Attempt autoplay once the correct video src is known
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {
      // Autoplay was blocked — the user will tap/click to enter anyway
    });
  }, [isMobile]);

  function goToDashboard() {
    router.push("/member-dashboard");
  }

  // Blank screen while detecting device — prevents wrong video flash
  if (isMobile === null) {
    return <div className="fixed inset-0 bg-black" />;
  }

  const videoSrc = isMobile ? "/welcome-video-phone.mp4" : "/welcome-video.mp4";
  const hint = isMobile ? "Tap anywhere to enter" : "Click anywhere to enter";

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-black cursor-pointer"
      onClick={goToDashboard}
    >
      {/* Video — covers the full screen, no letterboxing distortion */}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Entrance hint */}
      <p className="absolute bottom-8 left-0 right-0 text-center text-sm text-white/70 animate-pulse pointer-events-none">
        {hint}
      </p>
    </div>
  );
}
