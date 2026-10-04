"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The centrepiece: a glass orb holding a floating island with the sun (day)
 * or moon (night) hovering over it, like a little terrarium of the sky.
 */
export function TerrariumBubble({
  day,
  className,
}: {
  day: boolean;
  className?: string;
}) {
  return (
    <motion.div
      aria-hidden
      className={cn("relative aspect-square", className)}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Outer glow, tinted by the light source inside. */}
      <div
        className="absolute inset-[-12%] rounded-full blur-2xl transition-colors duration-1000"
        style={{
          background: day
            ? "radial-gradient(circle, rgb(255 214 140 / 0.45), transparent 65%)"
            : "radial-gradient(circle, rgb(150 180 255 / 0.35), transparent 65%)",
        }}
      />

      {/* The glass itself. Contents are clipped to the sphere. */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full border border-white/30 transition-[background] duration-1000"
        style={{
          background: day
            ? "radial-gradient(circle at 50% 38%, rgb(255 250 225 / 0.35), rgb(190 230 255 / 0.12) 55%, rgb(255 255 255 / 0.28) 100%)"
            : "radial-gradient(circle at 50% 38%, rgb(120 140 220 / 0.3), rgb(30 40 90 / 0.25) 55%, rgb(200 215 255 / 0.22) 100%)",
          boxShadow:
            "inset 0 0 40px rgb(255 255 255 / 0.25), inset 0 -20px 50px rgb(255 255 255 / 0.12)",
        }}
      >
        {!day && <BubbleStars />}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={day ? "sun" : "moon"}
            className="absolute top-[14%] left-1/2 w-[34%] -translate-x-1/2"
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {day ? <Sun /> : <Moon />}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <Cloud
          className="absolute top-[40%] left-[8%] w-[26%]"
          drift={10}
          duration={9}
          dim={!day}
        />
        <Cloud
          className="absolute top-[30%] right-[6%] w-[20%]"
          drift={-8}
          duration={11}
          dim={!day}
        />

        <Island day={day} className="absolute top-[54%] left-1/2 w-[76%] -translate-x-1/2" />
      </div>

      {/* Specular highlights sit above the contents so they read as glass. */}
      <div className="pointer-events-none absolute top-[7%] right-[14%] h-[16%] w-[26%] rotate-30 rounded-full bg-[radial-gradient(ellipse,rgb(255_255_255/0.7),transparent_70%)] blur-[2px]" />
      <div className="pointer-events-none absolute bottom-[10%] left-[16%] h-[6%] w-[18%] rotate-[-35deg] rounded-full bg-[radial-gradient(ellipse,rgb(255_255_255/0.35),transparent_70%)]" />
    </motion.div>
  );
}

function Sun() {
  return (
    <div className="relative aspect-square">
      <motion.svg
        viewBox="-50 -50 100 100"
        className="absolute inset-[-45%] size-[190%] opacity-70"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={i}
            x1="0"
            y1="-30"
            x2="0"
            y2="-44"
            stroke="rgb(255 220 140)"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${i * 30})`}
          />
        ))}
      </motion.svg>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #fff6c8 0%, #ffd45a 35%, #ff9f2e 75%, #f0742a 100%)",
          boxShadow:
            "0 0 30px 8px rgb(255 190 80 / 0.6), inset -6px -8px 14px rgb(200 80 20 / 0.35)",
        }}
      />
    </div>
  );
}

function Moon() {
  return (
    <div
      className="relative aspect-square rounded-full"
      style={{
        background:
          "radial-gradient(circle at 35% 30%, #fbfaf2 0%, #dfe2ec 45%, #aab2c8 85%, #8a93ad 100%)",
        boxShadow:
          "0 0 28px 6px rgb(190 210 255 / 0.45), inset -10px -8px 16px rgb(60 70 110 / 0.45)",
      }}
    >
      {[
        { x: 52, y: 26, s: 18 },
        { x: 26, y: 54, s: 13 },
        { x: 60, y: 62, s: 10 },
        { x: 38, y: 34, s: 7 },
      ].map((c, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[#b9bfd0]"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: `${c.s}%`,
            height: `${c.s}%`,
            boxShadow: "inset 1px 1px 2px rgb(80 90 120 / 0.5)",
          }}
        />
      ))}
    </div>
  );
}

function Cloud({
  className,
  drift,
  duration,
  dim,
}: {
  className?: string;
  drift: number;
  duration: number;
  dim: boolean;
}) {
  return (
    <motion.svg
      viewBox="0 0 60 30"
      className={cn("transition-opacity duration-1000", dim ? "opacity-40" : "opacity-90", className)}
      animate={{ x: [0, drift, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      <g fill="white">
        <circle cx="18" cy="18" r="10" />
        <circle cx="32" cy="13" r="12" />
        <circle cx="45" cy="19" r="9" />
        <rect x="10" y="18" width="42" height="10" rx="5" />
      </g>
    </motion.svg>
  );
}

function Island({ day, className }: { day: boolean; className?: string }) {
  const grassTop = day ? "#8fd16a" : "#3f7d5c";
  const grassSide = day ? "#5aa548" : "#2c5e47";
  const soilLight = day ? "#a5714b" : "#5c4a52";
  const soilDark = day ? "#6e4630" : "#3a2f3d";
  const leaf = day ? "#3f9445" : "#24563f";

  return (
    <svg viewBox="0 0 200 110" className={className}>
      <defs>
        <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={soilLight} />
          <stop offset="1" stopColor={soilDark} />
        </linearGradient>
        <radialGradient id="grass" cx="0.45" cy="0.35" r="0.7">
          <stop offset="0" stopColor={grassTop} />
          <stop offset="1" stopColor={grassSide} />
        </radialGradient>
      </defs>

      {/* Underside: a rounded clump of earth. */}
      <path d="M10,44 C22,108 178,108 190,44 Z" fill="url(#soil)" />
      <path
        d="M40,70 q10,6 20,0 M120,78 q12,5 22,-2 M80,88 q8,4 16,0"
        stroke={soilDark}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />

      {/* Grass lip, then the lawn on top. */}
      <ellipse cx="100" cy="46" rx="90" ry="18" fill={grassSide} />
      <ellipse cx="100" cy="40" rx="90" ry="18" fill="url(#grass)" />

      {/* A little pine and a couple of shrubs. */}
      <rect x="128" y="24" width="4" height="14" rx="1" fill={soilDark} />
      <path d="M130,0 L144,26 L116,26 Z" fill={leaf} />
      <path d="M130,8 L141,30 L119,30 Z" fill={leaf} opacity="0.85" />
      <circle cx="62" cy="38" r="9" fill={leaf} />
      <circle cx="72" cy="40" r="7" fill={grassSide} />
      <circle cx="98" cy="46" r="3" fill={day ? "#ffe07a" : "#c9d3ff"} />
      <circle cx="108" cy="50" r="2.5" fill={day ? "#ff9f9f" : "#c9d3ff"} />
    </svg>
  );
}

// Fixed positions so server and client markup agree.
const STARS = Array.from({ length: 14 }, (_, i) => ({
  x: 12 + ((i * 41.7) % 76),
  y: 8 + ((i * 29.3) % 40),
  d: (i % 5) * 0.7,
}));

function BubbleStars() {
  return (
    <div className="absolute inset-0">
      {STARS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute size-0.75 rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, delay: s.d }}
        />
      ))}
    </div>
  );
}
