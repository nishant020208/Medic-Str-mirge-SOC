import React, { useRef, useEffect } from 'react';
import { useTheme } from '../../store/themeStore';

interface Spark {
  x: number;
  y: number;
  angle: number;
  speed: number;
  radius: number;
  alpha: number;
  color: string;
}

export const ClickSpark: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Read colors from active semantic tokens
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim() || 'currentColor';
    const primary = styles.getPropertyValue('--primary').trim() || 'currentColor';
    const textOnPrimary = styles.getPropertyValue('--text-on-primary').trim() || 'currentColor';
    const border = styles.getPropertyValue('--border').trim() || 'currentColor';

    const tokenColors = [accent, primary, textOnPrimary, border];

    let isRunning = false;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (sparksRef.current.length === 0) {
        isRunning = false;
        return;
      }

      sparksRef.current.forEach((spark, index) => {
        spark.x += Math.cos(spark.angle) * spark.speed;
        spark.y += Math.sin(spark.angle) * spark.speed;
        spark.alpha -= 0.03;

        if (spark.alpha <= 0) {
          sparksRef.current.splice(index, 1);
          return;
        }

        ctx.save();
        ctx.globalAlpha = spark.alpha;
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (sparksRef.current.length > 0) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        isRunning = false;
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 768) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const sparkCount = 10;
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.5;
        sparksRef.current.push({
          x,
          y,
          angle,
          speed: 2 + Math.random() * 3,
          radius: 1.5 + Math.random() * 2,
          alpha: 1,
          color: tokenColors[Math.floor(Math.random() * tokenColors.length)],
        });
      }

      if (!isRunning) {
        isRunning = true;
        animId = requestAnimationFrame(render);
      }
    };

    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animId);
    };
  }, [theme]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      />
      {children}
    </>
  );
};
