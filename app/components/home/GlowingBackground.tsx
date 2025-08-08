'use client';

import { useEffect, useRef } from 'react';

export function GlowingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const glowPointsRef = useRef<Array<{ x: number; y: number; scale: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Initialize glow points
    const initGlowPoints = () => {
      glowPointsRef.current = [
        { x: canvas.width * 0.2, y: canvas.height * 0.3, scale: 1 },
        { x: canvas.width * 0.8, y: canvas.height * 0.2, scale: 0.8 },
        { x: canvas.width * 0.5, y: canvas.height * 0.8, scale: 1.2 },
      ];
    };
    initGlowPoints();

    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation function
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw fixed glow points
      glowPointsRef.current.forEach((point) => {
        const gradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, 300 * point.scale
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.04)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      // Draw mouse glow
      const mouseGradient = ctx.createRadialGradient(
        mouseRef.current.x, mouseRef.current.y, 0,
        mouseRef.current.x, mouseRef.current.y, 200
      );
      mouseGradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
      mouseGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
      mouseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = mouseGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
}
