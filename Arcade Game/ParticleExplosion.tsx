import React, { useEffect, useRef } from "react";

interface ParticleExplosionProps {
  color?: string;
  count?: number;
}

export function ParticleExplosion({ color = "#ef4444", count = 60 }: ParticleExplosionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: { x: number, y: number, vx: number, vy: number, life: number, maxLife: number, size: number }[] = [];
    
    for (let i = 0; i < count; i++) {
       const angle = Math.random() * Math.PI * 2;
       const speed = Math.random() * 5 + 2;
       particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: Math.random() * 40 + 40,
          size: Math.random() * 4 + 1
       });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let aliveCount = 0;
      for (let p of particles) {
         if (p.life < p.maxLife) {
            aliveCount++;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05; // slight gravity
            p.life++;

            const alpha = 1 - (p.life / p.maxLife);
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
         }
      }
      ctx.globalAlpha = 1;

      if (aliveCount > 0) {
         animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
       cancelAnimationFrame(animationId);
    };
  }, [color, count]);

  return (
    <canvas 
       ref={canvasRef} 
       style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} 
    />
  );
}
