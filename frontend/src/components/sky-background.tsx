"use client";

import { useNow } from "@/hooks/useNow";
import { skyPhase, skyStops } from "@/lib/sky";
import { cn } from "@/lib/utils";

/**
 * Full-screen gradient that follows the local time of day. Sits behind
 * everything; the glass panels blur whatever it paints.
 */
export function SkyBackground() {
  const now = useNow();
  // Recompute per minute only; the second-level tick changes nothing here.
  const minuteKey = now ? Math.floor(now.getTime() / 60_000) : null;
  const at = minuteKey === null ? null : new Date(minuteKey * 60_000);

  const [top, mid, bottom] = at
    ? skyStops(at)
    : ["#0b1026", "#141b3a", "#1f2a4d"];
  const phase = at ? skyPhase(at) : "night";
  const night = phase === "night" || phase === "dusk";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 transition-[background] duration-1000"
      style={{
        background: `linear-gradient(180deg, ${top} 0%, ${mid} 55%, ${bottom} 100%)`,
      }}
    >
      {/* Soft light source: warm sun glow by day, faint moonlight by night. */}
      <div
        className={cn(
          "absolute -top-1/4 left-1/2 aspect-square w-[140vmax] -translate-x-1/2 rounded-full blur-3xl transition-opacity duration-1000",
          night ? "opacity-20" : "opacity-40",
        )}
        style={{
          background: night
            ? "radial-gradient(circle, rgb(180 200 255 / 0.35), transparent 60%)"
            : "radial-gradient(circle, rgb(255 236 200 / 0.35), transparent 60%)",
        }}
      />
      {night && <Stars />}
    </div>
  );
}

// Fixed positions so server and client markup agree.
const STARS = Array.from({ length: 40 }, (_, i) => ({
  x: (i * 37.3) % 100,
  y: (i * 23.7) % 55,
  s: 1 + (i % 3) * 0.5,
  d: (i % 7) * 0.6,
}));

function Stars() {
  return (
    <div className="absolute inset-0">
      {STARS.map((star, i) => (
        <span
          key={i}
          className="absolute animate-pulse rounded-full bg-white/70"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.s,
            height: star.s,
            animationDelay: `${star.d}s`,
            animationDuration: "3s",
          }}
        />
      ))}
    </div>
  );
}
