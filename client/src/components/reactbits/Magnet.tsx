import React, { useRef, useState } from 'react';

interface MagnetProps {
  children: React.ReactNode;
  padding?: number;
  disabled?: boolean;
  magnetStrength?: number;
  className?: string;
}

export const Magnet: React.FC<MagnetProps> = ({
  children,
  padding = 40,
  disabled = false,
  magnetStrength = 2,
  className = '',
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current?.getBoundingClientRect() || {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };

    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const distX = Math.abs(centerX - clientX);
    const distY = Math.abs(centerY - clientY);

    if (distX < width / 2 + padding && distY < height / 2 + padding) {
      setPosition({
        x: (clientX - centerX) / magnetStrength,
        y: (clientY - centerY) / magnetStrength,
      });
    } else {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: position.x === 0 && position.y === 0 ? 'transform 0.4s ease-out' : 'transform 0.1s ease-out',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
};
