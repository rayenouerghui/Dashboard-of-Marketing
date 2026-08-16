"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const handleEnter = () => {
    router.push("/member-dashboard");
  };

  return (
    <div 
      className="fixed inset-0 w-full h-screen bg-white cursor-pointer flex items-center justify-center"
      onClick={handleEnter}
    >
      <video
        key={isMobile ? "phone" : "desktop"}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-contain max-w-screen max-h-screen"
      >
        <source src={isMobile ? "/welcome-video-phone.mp4" : "/welcome-video.mp4"} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Click hint overlay */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 text-sm animate-pulse">
        Click anywhere to enter dashboard
      </div>
    </div>
  );
}

