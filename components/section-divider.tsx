'use client'

import { motion } from 'motion/react';
import { durations } from '@/lib/motion-system';

interface SectionDividerProps {
  className?: string;
}

export function SectionDivider({ className = '' }: SectionDividerProps) {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: durations.slow }}
      className={`h-px bg-gradient-to-r from-transparent via-border to-transparent ${className}`}
      style={{
        transformOrigin: 'center',
      }}
    />
  );
}
