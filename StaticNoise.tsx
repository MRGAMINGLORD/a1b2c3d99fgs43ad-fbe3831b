import React, { useRef, useEffect } from "react";

export function StaticNoise({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let w = canvas.width;
    let h = canvas.height;
    
    // We can pre-generate a few frames of noise to save CPU
    const frames: ImageData[] = [];
    for (let i = 0; i < 5; i++) {
       const imgData = ctx.createImageData(w, h);
       const buf32 = new Uint32Array(imgData.data.buffer);
       for (let j = 0; j < buf32.length; j++) {
           // random grayscale color
           const v = Math.random() < 0.5 ? 0 : 255;
           buf32[j] = 0xff000000 | (v << 16) | (v << 8) | v;
       }
       frames.push(imgData);
    }

    let frame = 0;
    let timeoutId: NodeJS.Timeout;

    const render = () => {
       ctx.putImageData(frames[frame], 0, 0);
       frame = (frame + 1) % frames.length;
       timeoutId = setTimeout(render, 50); // 20fps noise is enough
    };
    render();

    return () => clearTimeout(timeoutId);
  }, [active]);

  if (!active) return null;

  return (
    <canvas 
      ref={canvasRef} 
      width={100} 
      height={100} 
      className="absolute inset-0 w-full h-full opacity-20 mix-blend-overlay pointer-events-none" 
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
