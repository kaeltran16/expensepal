import { hapticFeedback } from '@/lib/utils';
import { useState, useRef, RefObject } from 'react';

interface UsePullToRefreshOptions {
  threshold?: number;
  maxDistance?: number;
  onRefresh: () => Promise<void>;
  enabled?: boolean;
}

export function usePullToRefresh({
  threshold = 70,
  maxDistance = 100,
  onRefresh,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStart = useRef(0);

  const handleTouchStart = (e: React.TouchEvent, contentRef: RefObject<HTMLDivElement>) => {
    if (
      enabled &&
      contentRef.current &&
      contentRef.current.scrollTop === 0
    ) {
      touchStart.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (enabled && touchStart.current) {
      const pull = e.touches[0].clientY - touchStart.current;
      if (pull > 0) {
        setPullDistance(Math.min(pull, maxDistance));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (enabled && pullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true);
      hapticFeedback('medium');
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    touchStart.current = 0;
  };

  return {
    pullDistance,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
