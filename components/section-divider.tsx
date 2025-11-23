'use client'

import { motion } from 'framer-motion';

interface SectionDividerProps {
  className?: string;
}

export function SectionDivider({ className = '' }: SectionDividerProps) {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={`h-px bg-gradient-to-r from-transparent via-border to-transparent ${className}`}
      style={{
        transformOrigin: 'center',
      }}
    />
  );
}
