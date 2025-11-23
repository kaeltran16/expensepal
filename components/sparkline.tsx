'use client'

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  showDots?: boolean;
  animated?: boolean;
}

const COLOR_CLASSES = {
  primary: 'stroke-primary',
  success: 'stroke-green-500',
  warning: 'stroke-yellow-500',
  danger: 'stroke-red-500',
  muted: 'stroke-muted-foreground',
};

export function Sparkline({
  data,
  width = 100,
  height = 30,
  className,
  color = 'primary',
  showDots = false,
  animated = true,
}: SparklineProps) {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Generate SVG path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  const pathData = points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${point.x},${point.y}`;
    })
    .join(' ');

  // Calculate path length for animation
  const pathLength = points.reduce((acc, point, index) => {
    if (index === 0) return 0;
    const prev = points[index - 1];
    return acc + Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2));
  }, 0);

  return (
    <svg
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      {animated ? (
        <motion.path
          d={pathData}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={COLOR_CLASSES[color]}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      ) : (
        <path
          d={pathData}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={COLOR_CLASSES[color]}
        />
      )}

      {showDots &&
        points.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={2}
            className={cn('fill-current', COLOR_CLASSES[color])}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: animated ? index * 0.05 : 0, duration: 0.3 }}
          />
        ))}
    </svg>
  );
}

// Area sparkline variant (filled)
export function AreaSparkline({
  data,
  width = 100,
  height = 30,
  className,
  color = 'primary',
}: Omit<SparklineProps, 'showDots' | 'animated'>) {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  const pathData = points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${point.x},${point.y}`;
    })
    .join(' ');

  const areaPath = `${pathData} L ${width},${height} L 0,${height} Z`;

  const fillClasses = {
    primary: 'fill-primary/20',
    success: 'fill-green-500/20',
    warning: 'fill-yellow-500/20',
    danger: 'fill-red-500/20',
    muted: 'fill-muted-foreground/20',
  };

  return (
    <svg
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopOpacity={0.3} />
          <stop offset="100%" stopOpacity={0} />
        </linearGradient>
      </defs>

      <motion.path
        d={areaPath}
        className={fillClasses[color]}
        style={{ fill: `url(#gradient-${color})` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      <motion.path
        d={pathData}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={COLOR_CLASSES[color]}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}
