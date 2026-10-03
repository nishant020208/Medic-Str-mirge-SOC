import React, { useEffect, useRef } from 'react';

export const Silk: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let step = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // If reduced motion, draw static backdrop
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0B1F4B');
      grad.addColorStop(1, '#060F26');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return () => window.removeEventListener('resize', resize);
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      // Draw subtle luminous auroral silk waves
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const yOffset = height * 0.4 + i * 80;
        ctx.moveTo(0, yOffset);

        for (let x = 0; x <= width; x += 20) {
          const y =
            yOffset +
            Math.sin(x * 0.003 + step * 0.02 + i) * 50 +
            Math.cos(x * 0.002 - step * 0.015) * 30;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, yOffset - 50, width, height);
        if (i === 0) {
          grad.addColorStop(0, 'rgba(201, 162, 39, 0.06)'); // Gold
          grad.addColorStop(1, 'rgba(11, 31, 75, 0.15)'); // Lapis
        } else if (i === 1) {
          grad.addColorStop(0, 'rgba(29, 59, 130, 0.08)'); // Lapis light
          grad.addColorStop(1, 'rgba(229, 200, 102, 0.05)'); // Soft gold
        } else {
          grad.addColorStop(0, 'rgba(181, 83, 47, 0.04)'); // Terracotta faint
          grad.addColorStop(1, 'rgba(6, 15, 38, 0.2)'); // Deep lapis
        }

        ctx.fillStyle = grad;
        ctx.fill();
      }

      step++;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none -z-10 ${className}`}
    />
  );
};
