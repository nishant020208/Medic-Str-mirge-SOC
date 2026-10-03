import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../store/themeStore';

export const Silk: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

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

    // Read colors from active semantic tokens
    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue('--primary').trim() || 'currentColor';
    const accent = styles.getPropertyValue('--accent').trim() || 'currentColor';
    const surface = styles.getPropertyValue('--surface').trim() || 'transparent';

    // If reduced motion, draw static soft gradient
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, surface);
      grad.addColorStop(1, primary);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return () => window.removeEventListener('resize', resize);
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      // Draw subtle luminous waves driven by token colors
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
        grad.addColorStop(0, i % 2 === 0 ? accent : primary);
        grad.addColorStop(1, i % 2 === 0 ? primary : accent);

        ctx.globalAlpha = 0.05 + i * 0.03;
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      step++;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none -z-10 ${className}`}
    />
  );
};
