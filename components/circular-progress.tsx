'use client'

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

const COLOR_CLASSES = {
  primary: 'stroke-primary',
  success: 'stroke-green-500',
  warning: 'stroke-yellow-500',
  danger: 'stroke-orange-500',
};

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  showValue = true,
  valueFormatter = (v) => `${Math.round(v)}%`,
  color = 'primary',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  // Determine color based on value if color is 'primary'
  const progressColor =
    color === 'primary'
      ? value >= 100
        ? 'danger'
        : value >= 80
        ? 'warning'
        : 'success'
      : color;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: 1,
            ease: [0.4, 0, 0.2, 1],
          }}
          className={cn(COLOR_CLASSES[progressColor])}
        />
      </svg>
      {showValue && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="text-sm font-semibold">
            {valueFormatter(value)}
          </span>
        </motion.div>
      )}
    </div>
  );
}

// Compact version for inline use
export function MiniCircularProgress({
  value,
  size = 40,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const progressColor =
    value >= 100 ? 'danger' : value >= 80 ? 'warning' : 'success';

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1],
          }}
          className={cn(COLOR_CLASSES[progressColor])}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold">{Math.round(value)}%</span>
      </div>
    </div>
  );
}
