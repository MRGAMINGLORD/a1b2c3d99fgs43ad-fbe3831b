// Ambient canvas animations shown around any password-entry surface
// (admin login, tester login, DEFCON 2 blast door). Two "Subway Surfers"
// runners on the left/right and a "Geometry Dash" cube on the top.
//
// Memory-safety notes:
//   * ONE shared requestAnimationFrame drives all three canvases.
//   * Each canvas is small (fixed CSS size + capped devicePixelRatio) so we
//     never allocate a full-screen framebuffer.
//   * Loop resets state every 3 minutes so no numeric drift accumulates.
//   * Pauses when the tab is hidden and fully cleans up on unmount.

import { useEffect, useRef } from "react";

const LOOP_MS = 3 * 60 * 1000; // 3 minutes
const FPS_CAP = 30;
const FRAME_MS = 1000 / FPS_CAP;
const SIDE_W = 90;   // css px
const TOP_H = 70;    // css px

const YELLOW = "#facc15";
const YELLOW_DIM = "#a16207";
const BG = "#0a0a0a";

// ---------- Subway Surfers (vertical runner) ----------
const drawSubway = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number, // ms since loop start
  seed: number,
) => {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  // Three vertical tracks
  const laneW = w / 3;
  ctx.strokeStyle = "#1f1f1f";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * laneW, 0);
    ctx.lineTo(i * laneW, h);
    ctx.stroke();
  }

  // Scrolling rail ties (parallax)
  const speed = 0.18;
  const spacing = 24;
  const offset = (t * speed) % spacing;
  ctx.fillStyle = YELLOW_DIM;
  for (let y = -spacing + offset; y < h; y += spacing) {
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(i * laneW + 6, y, laneW - 12, 3);
    }
  }

  // Oncoming "train" obstacles per lane, deterministic from seed
  for (let i = 0; i < 3; i++) {
    const phase = ((t + seed * 1000 + i * 1700) / 2200) % 1;
    const y = phase * (h + 60) - 60;
    if (y > -50 && y < h) {
      ctx.fillStyle = i === 1 ? "#3b82f6" : "#ef4444";
      ctx.fillRect(i * laneW + 10, y, laneW - 20, 40);
      ctx.fillStyle = "#000";
      ctx.fillRect(i * laneW + 14, y + 6, laneW - 28, 8);
    }
  }

  // Runner sprite bobbing near the bottom, switching lanes on a cycle
  const laneCycle = Math.floor((t + seed * 400) / 1500) % 3;
  const bob = Math.sin(t / 120) * 2;
  const cx = laneCycle * laneW + laneW / 2;
  const cy = h - 22 + bob;
  ctx.fillStyle = YELLOW;
  ctx.fillRect(cx - 6, cy - 10, 12, 14); // body
  ctx.beginPath();
  ctx.arc(cx, cy - 14, 5, 0, Math.PI * 2); // head
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.fillRect(cx - 2, cy - 15, 4, 2); // visor
};

// ---------- Geometry Dash (horizontal cube) ----------
const drawGeoDash = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
) => {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const groundY = h - 14;

  // Scrolling ground grid
  const speed = 0.22;
  const cell = 20;
  const offset = (t * speed) % cell;
  ctx.strokeStyle = "#1f1f1f";
  ctx.lineWidth = 1;
  for (let x = -cell + offset; x < w; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.fillStyle = YELLOW_DIM;
  ctx.fillRect(0, groundY, w, 2);

  // Spikes
  ctx.fillStyle = YELLOW;
  const spikeSpacing = 90;
  for (let i = -1; i < Math.ceil(w / spikeSpacing) + 2; i++) {
    const sx = i * spikeSpacing + offset * 4;
    if (sx < -20 || sx > w + 20) continue;
    ctx.beginPath();
    ctx.moveTo(sx, groundY);
    ctx.lineTo(sx + 8, groundY - 14);
    ctx.lineTo(sx + 16, groundY);
    ctx.closePath();
    ctx.fill();
  }

  // Auto-jumping cube — jump period synced to spike spacing so it "clears"
  const jumpPeriod = spikeSpacing / (speed * 4); // ms per spike
  const phase = (t % jumpPeriod) / jumpPeriod;
  const jumpH = Math.sin(phase * Math.PI) * 22;
  const cubeX = w * 0.25;
  const cubeY = groundY - 12 - jumpH;
  ctx.save();
  ctx.translate(cubeX + 6, cubeY + 6);
  ctx.rotate(phase * Math.PI * 2);
  ctx.fillStyle = YELLOW;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.fillStyle = "#000";
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
};

export const PasswordGateDecor = () => {
  const leftRef = useRef<HTMLCanvasElement>(null);
  const rightRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const setup = (
      canvas: HTMLCanvasElement | null,
      cssW: number,
      cssH: number,
    ): CanvasRenderingContext2D | null => {
      if (!canvas) return null;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    };

    const resize = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      leftCtx = setup(leftRef.current, SIDE_W, vh);
      rightCtx = setup(rightRef.current, SIDE_W, vh);
      topCtx = setup(topRef.current, vw, TOP_H);
    };

    let leftCtx: CanvasRenderingContext2D | null = null;
    let rightCtx: CanvasRenderingContext2D | null = null;
    let topCtx: CanvasRenderingContext2D | null = null;
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let last = start;
    let raf = 0;
    let running = true;

    const tick = (now: number) => {
      if (!running) return;
      if (now - last < FRAME_MS) {
        raf = requestAnimationFrame(tick);
        return;
      }
      last = now;
      const t = (now - start) % LOOP_MS;
      if (leftCtx && leftRef.current) {
        drawSubway(
          leftCtx,
          SIDE_W,
          leftRef.current.clientHeight,
          t,
          1,
        );
      }
      if (rightCtx && rightRef.current) {
        drawSubway(
          rightCtx,
          SIDE_W,
          rightRef.current.clientHeight,
          t,
          2,
        );
      }
      if (topCtx && topRef.current) {
        drawGeoDash(topCtx, topRef.current.clientWidth, TOP_H, t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <canvas
        ref={topRef}
        className="absolute left-0 right-0 top-0 border-b border-primary/30"
      />
      <canvas
        ref={leftRef}
        className="absolute bottom-0 left-0 top-0 border-r border-primary/30"
      />
      <canvas
        ref={rightRef}
        className="absolute bottom-0 right-0 top-0 border-l border-primary/30"
      />
    </div>
  );
};
