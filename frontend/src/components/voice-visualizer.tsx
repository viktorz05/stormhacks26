"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type VisualizerMode = "idle" | "ringing" | "listening";

interface VoiceVisualizerProps {
  /** Mic level, 0–100 (from useMicrophone). */
  volume: number;
  mode?: VisualizerMode;
  className?: string;
}

const ORB_COLOR: Record<VisualizerMode, string> = {
  idle: "var(--muted-foreground)",
  ringing: "var(--alarm)",
  listening: "var(--listen)",
};

const RIPPLES = [0, 0.6, 1.2];

/**
 * A glowing orb that swells with mic volume. While ringing it throbs and throws
 * off ripples on its own; while listening it tracks the user's voice.
 */
export function VoiceVisualizer({
  volume,
  mode = "listening",
  className,
}: VoiceVisualizerProps) {
  const reduceMotion = useReducedMotion();

  // Volume arrives in coarse steps; a spring turns it into fluid motion.
  const raw = useMotionValue(0);
  useEffect(() => {
    raw.set(mode === "listening" ? volume : 0);
  }, [raw, volume, mode]);
  const level = useSpring(raw, { stiffness: 300, damping: 24, mass: 0.5 });

  const orbScale = useTransform(level, [0, 100], [1, 1.35]);
  const haloScale = useTransform(level, [0, 100], [1.05, 1.9]);
  const haloOpacity = useTransform(level, [0, 100], [0.35, 0.9]);
  const outerScale = useTransform(level, [0, 100], [1.2, 2.5]);
  const outerOpacity = useTransform(level, [0, 100], [0.08, 0.4]);
  const glowBlur = useTransform(level, [0, 100], [24, 64]);
  const glow = useMotionTemplate`blur(${glowBlur}px)`;

  const ringing = mode === "ringing";

  return (
    <div
      role="img"
      aria-label={
        ringing
          ? "Alarm ringing"
          : mode === "listening"
            ? "Microphone active and listening"
            : "Microphone off"
      }
      style={{ "--orb": ORB_COLOR[mode] } as CSSProperties}
      className={cn(
        "relative grid aspect-square w-64 place-items-center sm:w-80",
        className,
      )}
    >
      {/* Ripples: rings that roll outward while the alarm is going off. */}
      {ringing &&
        !reduceMotion &&
        RIPPLES.map((delay) => (
          <motion.span
            key={delay}
            className="absolute inset-[22%] rounded-full border-2 border-(--orb)"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 2.3, opacity: 0 }}
            transition={{
              duration: 1.8,
              delay,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        ))}

      {/* Faint outer aura, reacts to voice. */}
      <motion.span
        className="absolute inset-[22%] rounded-full bg-(--orb)"
        style={{ scale: outerScale, opacity: outerOpacity, filter: glow }}
      />

      {/* Halo directly around the orb. */}
      <motion.span
        className="absolute inset-[22%] rounded-full bg-(--orb) blur-2xl"
        style={{ scale: haloScale, opacity: haloOpacity }}
      />

      {/* The orb. Outer layer handles the alarm throb, inner layer the voice. */}
      <motion.div
        className="absolute inset-[22%]"
        animate={
          ringing && !reduceMotion
            ? { scale: [1, 1.12, 1] }
            : mode === "idle" && !reduceMotion
              ? { scale: [1, 1.03, 1] }
              : { scale: 1 }
        }
        transition={
          ringing
            ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
            : mode === "idle"
              ? { duration: 4, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }
        }
      >
        <motion.div
          className="size-full rounded-full shadow-[0_0_60px_-10px_var(--orb)] transition-colors duration-700"
          style={{
            scale: orbScale,
            background:
              "radial-gradient(circle at 35% 30%, color-mix(in oklch, var(--orb), white 55%) 0%, var(--orb) 45%, color-mix(in oklch, var(--orb), black 45%) 100%)",
          }}
        />
      </motion.div>
    </div>
  );
}
