"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/context/AuthContext";

export default function LandingPageClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { role, hydrated } = useAuth();

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
    // If already logged in as member, go directly to member dashboard
    if (hydrated && role === "member") {
      router.push("/member-dashboard");
      return;
    }
    // If already logged in as admin, go to admin dashboard
    if (hydrated && role === "admin") {
      router.push("/dashboard");
      return;
    }
    // Otherwise, show member login modal
    setIsLoginOpen(true);
  }

  // Blank screen while detecting device — prevents wrong video flash
  if (isMobile === null) {
    return <div className="fixed inset-0 bg-black" />;
  }

  const videoSrc = isMobile ? "/welcome-video-phone.mp4" : "/welcome-video.mp4";
  const hint = isMobile ? "Tap anywhere to enter" : "Click anywhere to enter";

  return (
    <>
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

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} isAdminLogin={false} />
    </>
  );
}
