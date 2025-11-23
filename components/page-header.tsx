'use client'

import type { ViewType } from '@/lib/constants/filters';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  activeView: ViewType;
  scrolled: boolean;
}

const VIEW_TITLES: Record<ViewType, string> = {
  expenses: 'Expenses',
  analytics: 'Analytics',
  budget: 'Budget',
  goals: 'Goals',
  calories: 'Calories',
  summary: 'Summary',
  insights: 'Insights',
};

export function PageHeader({ activeView, scrolled }: PageHeaderProps) {
  const title = VIEW_TITLES[activeView];

  return (
    <motion.div
      animate={{
        paddingBottom: scrolled ? '0.75rem' : '1rem',
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="sticky z-40 px-4 pt-4"
      style={{
        backgroundColor: scrolled ? 'rgba(var(--background-rgb), 0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '0.5px solid rgba(var(--ios-separator))' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* iOS Large Title */}
      <motion.div
        animate={{
          opacity: scrolled ? 0 : 1,
          scale: scrolled ? 0.9 : 1,
          height: scrolled ? 0 : 'auto',
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="overflow-hidden"
      >
        <h1 className="ios-large-title">{title}</h1>
      </motion.div>

      {/* Compact Title (shown when scrolled) */}


      {/* Hairline separator when scrolled */}
  
    </motion.div>
  );
}
