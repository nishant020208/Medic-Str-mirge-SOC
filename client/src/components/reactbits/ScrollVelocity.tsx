import React from 'react';

interface ScrollVelocityProps {
  texts: string[];
  velocity?: number;
  className?: string;
}

export const ScrollVelocity: React.FC<ScrollVelocityProps> = ({
  texts,
  className = '',
}) => {
  // Duplicate array to ensure seamless infinite scroll
  const duplicated = [...texts, ...texts, ...texts, ...texts];

  return (
    <div className={`overflow-hidden whitespace-nowrap py-3 select-none flex ${className}`}>
      <div className="flex animate-[marquee_30s_linear_infinite] will-change-transform gap-8 items-center">
        {duplicated.map((text, idx) => (
          <div key={idx} className="flex items-center gap-6">
            <span className="font-cinzel text-xs tracking-widest uppercase font-bold text-accent-text">
              {text}
            </span>
            <span className="text-accent/40 text-xs">❖</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[marquee_30s_linear_infinite\\] {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
};
