"use client";

import { LoginModal } from "@/components/auth/LoginModal";
import { useState } from "react";

export default function AdminLoginPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Admin Login</h1>
        <p className="text-gray-400 mb-8">AIESEC LC Tunis Dashboard</p>
      </div>
      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        isAdminLogin={true} 
      />
    </div>
  );
}
