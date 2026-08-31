import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AIESEC LC Tunis | Dashboard",
  description: "AIESEC LC Tunis Operations Dashboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

// viewport is exported separately in Next.js 14+
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <AuthProvider>
          <ThemeProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
