import React, { useEffect, useState, useRef } from 'react';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  separator?: string;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  duration = 2,
  separator = ',',
  className = '',
  prefix = '',
  suffix = '',
}) => {
  const [count, setCount] = useState(from);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // If reduced motion is requested, show final immediately
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(to);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let startTime: number | null = null;

          const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
            // Ease out quad
            const easeProgress = 1 - (1 - progress) * (1 - progress);
            const current = Math.floor(from + (to - from) * easeProgress);
            setCount(current);

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              setCount(to);
            }
          };

          requestAnimationFrame(step);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [from, to, duration]);

  const formattedNumber = count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  return (
    <span ref={elementRef} className={className}>
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
};
