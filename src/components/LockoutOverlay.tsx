import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PASSWORD_GATE_LABELS,
  PASSWORD_GATE_LOCKED_OUT_EVENT,
  formatPasswordGateLockout,
  getPasswordGateLockoutUntil,
  type PasswordGateId,
  type PasswordGateLockedOutDetail,
} from "@/lib/passwordGate";

/**
 * Persistent lockout cinematic. Stays on-screen for the entire lockout
 * window for whichever gate triggered the lockout, and only unmounts once
 * the lockout expires. Pure-CSS infinite animation — no JS timers per
 * frame, no DOM growth, no listeners attached during the animation.
 *
 * Cycle (8s, infinite):
 *   - Side doors slide in from left/right and meet in the middle.
 *   - Top + bottom doors slide in over them.
 *   - Side doors fade out (deleted), leaving the top/bottom pair sealed.
 *   - Loop restarts.
 */

const GATE_IDS: PasswordGateId[] = [
  "admin-login",
  "test-access",
  "edit-access",
  "defcon-access",
];

interface ActiveLock {
  id: PasswordGateId;
  label: string;
  lockoutUntil: number;
}

const findActiveLock = (): ActiveLock | null => {
  const now = Date.now();
  let soonest: ActiveLock | null = null;
  for (const id of GATE_IDS) {
    const until = getPasswordGateLockoutUntil(id);
    if (until > now && (!soonest || until < soonest.lockoutUntil)) {
      soonest = { id, label: PASSWORD_GATE_LABELS[id], lockoutUntil: until };
    }
  }
  return soonest;
};

// Routes that should trigger the lockout cinematic + redirect.
const ROUTE_GATES: { match: (path: string) => boolean; gate: PasswordGateId }[] = [
  { match: (p) => p === "/login" || p.startsWith("/admin"), gate: "admin-login" },
  { match: (p) => p === "/test" || p.startsWith("/play-test"), gate: "test-access" },
];

const KICK_AFTER_MS = 8000; // one full animation cycle

export const LockoutOverlay = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine which gate (if any) is locking the *current* route.
  const routeLock = useMemo<ActiveLock | null>(() => {
    const now = Date.now();
    for (const entry of ROUTE_GATES) {
      if (!entry.match(location.pathname)) continue;
      const until = getPasswordGateLockoutUntil(entry.gate);
      if (until > now) {
        return { id: entry.gate, label: PASSWORD_GATE_LABELS[entry.gate], lockoutUntil: until };
      }
    }
    return null;
  }, [location.pathname]);

  const [active, setActive] = useState<ActiveLock | null>(routeLock);
  const [, setTick] = useState(0);

  // Sync with route changes.
  useEffect(() => {
    setActive(routeLock);
  }, [routeLock]);

  // Listen for fresh lockouts triggered from a gate the user is on right now.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PasswordGateLockedOutDetail>).detail;
      if (!detail) return;
      const onLockedRoute = ROUTE_GATES.some(
        (r) => r.gate === detail.id && r.match(location.pathname),
      );
      if (!onLockedRoute) return;
      setActive({
        id: detail.id,
        label: detail.label,
        lockoutUntil: detail.lockoutUntil,
      });
    };
    window.addEventListener(PASSWORD_GATE_LOCKED_OUT_EVENT, handler);
    return () => window.removeEventListener(PASSWORD_GATE_LOCKED_OUT_EVENT, handler);
  }, [location.pathname]);

  // After one animation cycle, kick the visitor back to the main site.
  useEffect(() => {
    if (!active) return;
    const kick = window.setTimeout(() => navigate("/", { replace: true }), KICK_AFTER_MS);
    const tick = window.setInterval(() => {
      if (active.lockoutUntil <= Date.now()) setActive(null);
      else setTick((t) => t + 1);
    }, 60_000);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(tick);
    };
  }, [active, navigate]);

  if (!active) return null;

  const remainingText = formatPasswordGateLockout(active.lockoutUntil);

  const doorBg =
    "repeating-linear-gradient(45deg, hsl(var(--foreground)) 0 22px, hsl(var(--background)) 22px 44px)";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={`Locked out of ${active.label}`}
      className="fixed inset-0 z-[10000] overflow-hidden bg-background"
    >
      <style>{`
        @keyframes lockout-door-left {
          0%   { transform: translateX(-100%); opacity: 1; }
          20%  { transform: translateX(0);     opacity: 1; }
          40%  { transform: translateX(0);     opacity: 1; }
          45%  { transform: translateX(0);     opacity: 0; }
          100% { transform: translateX(0);     opacity: 0; }
        }
        @keyframes lockout-door-right {
          0%   { transform: translateX(100%);  opacity: 1; }
          20%  { transform: translateX(0);     opacity: 1; }
          40%  { transform: translateX(0);     opacity: 1; }
          45%  { transform: translateX(0);     opacity: 0; }
          100% { transform: translateX(0);     opacity: 0; }
        }
        @keyframes lockout-door-top {
          0%   { transform: translateY(-100%); }
          20%  { transform: translateY(-100%); }
          40%  { transform: translateY(0); }
          100% { transform: translateY(0); }
        }
        @keyframes lockout-door-bottom {
          0%   { transform: translateY(100%); }
          20%  { transform: translateY(100%); }
          40%  { transform: translateY(0); }
          100% { transform: translateY(0); }
        }
        .lockout-door {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform, opacity;
          backface-visibility: hidden;
        }
        .lockout-door-left   { top: 0; left: 0;   width: 50%;  height: 100%; border-right: 3px solid hsl(var(--foreground)); animation: lockout-door-left   8s ease-in-out infinite; }
        .lockout-door-right  { top: 0; right: 0;  width: 50%;  height: 100%; border-left:  3px solid hsl(var(--foreground)); animation: lockout-door-right  8s ease-in-out infinite; }
        .lockout-door-top    { top: 0; left: 0;   width: 100%; height: 50%;  border-bottom: 3px solid hsl(var(--foreground)); animation: lockout-door-top    8s ease-in-out infinite; }
        .lockout-door-bottom { bottom: 0; left: 0;width: 100%; height: 50%;  border-top:    3px solid hsl(var(--foreground)); animation: lockout-door-bottom 8s ease-in-out infinite; }
        .lockout-door-text {
          font-family: 'Black Ops One', cursive;
          color: hsl(var(--foreground));
          text-transform: uppercase;
          letter-spacing: 0.18em;
          text-align: center;
          padding: 0 1rem;
          font-size: clamp(1rem, 3vw, 2rem);
          line-height: 1.15;
        }
        @media (prefers-reduced-motion: reduce) {
          .lockout-door-left,
          .lockout-door-right,
          .lockout-door-top,
          .lockout-door-bottom { animation: none; transform: none; opacity: 1; }
          .lockout-door-left, .lockout-door-right { opacity: 0; }
        }
      `}</style>

      {/* Side doors (rendered first / behind) */}
      <div className="lockout-door lockout-door-left" style={{ backgroundImage: doorBg, zIndex: 1 }}>
        <div className="lockout-door-text">You Are<br />Locked Out</div>
      </div>
      <div className="lockout-door lockout-door-right" style={{ backgroundImage: doorBg, zIndex: 1 }}>
        <div className="lockout-door-text">You Are<br />Locked Out</div>
      </div>

      {/* Top / bottom doors (rendered on top, seal the screen) */}
      <div className="lockout-door lockout-door-top" style={{ backgroundImage: doorBg, zIndex: 2 }}>
        <div className="lockout-door-text">
          Try Again In<br />{remainingText}
        </div>
      </div>
      <div className="lockout-door lockout-door-bottom" style={{ backgroundImage: doorBg, zIndex: 2 }}>
        <div className="lockout-door-text">
          {active.label}
        </div>
      </div>
    </div>
  );
};

export default LockoutOverlay;
