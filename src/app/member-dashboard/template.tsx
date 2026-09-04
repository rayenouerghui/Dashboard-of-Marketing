"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface TemplateProps {
  children: ReactNode;
}

export default function Template({ children }: TemplateProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        initial={{ opacity: 0, y: isMobile ? 2 : 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: isMobile ? -2 : -4 }}
        transition={{
          duration: isMobile ? 0.15 : 0.2,
          ease: [0.32, 0.72, 0, 1],
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
