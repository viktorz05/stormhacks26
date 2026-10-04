"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicButtonProps {
  active: boolean;
  /** Mic level 0–100, drives the glow while active. */
  volume: number;
  disabled?: boolean;
  failed?: boolean;
  onToggle: () => void;
  /** Live speech-to-text, final + interim. */
  transcript?: string;
  interim?: string;
  prompt?: string;
}

/**
 * Big glowing push-to-talk button with a live transcript underneath. Idle it
 * breathes softly; active it glows cyan, ripples, and swells with your voice.
 */
export function MicButton({
  active,
  volume,
  disabled,
  failed,
  onToggle,
  transcript,
  interim,
  prompt = "Ask for more time…",
}: MicButtonProps) {
  const reduceMotion = useReducedMotion();
  const level = active ? volume / 100 : 0;
  const hasText = Boolean(transcript || interim);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="relative grid size-28 place-items-center">
        {/* Glow that tracks voice level. */}
        <motion.span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full blur-2xl transition-colors duration-500",
            active ? "bg-listen" : "bg-white/40",
          )}
          animate={{
            scale: active ? 1 + level * 0.8 : reduceMotion ? 1 : [0.9, 1.05, 0.9],
            opacity: active ? 0.55 + level * 0.4 : 0.35,
          }}
          transition={
            active
              ? { type: "spring", stiffness: 300, damping: 20 }
              : { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }
        />

        {/* Ripples while capturing. */}
        {active &&
          !reduceMotion &&
          [0, 0.7, 1.4].map((delay) => (
            <motion.span
              key={delay}
              aria-hidden
              className="absolute inset-2 rounded-full border border-listen/70"
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 2.1, delay, repeat: Infinity, ease: "easeOut" }}
            />
          ))}

        <motion.button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-pressed={active}
          aria-label={active ? "Stop listening" : "Start speaking"}
          whileTap={{ scale: 0.94 }}
          className={cn(
            "glass-light relative grid size-24 place-items-center rounded-full outline-none",
            "transition-[background-color,box-shadow] duration-300 focus-visible:ring-4 focus-visible:ring-white/40",
            "disabled:opacity-60",
            active &&
              "bg-listen/35 shadow-[0_0_48px_-4px_var(--listen),inset_0_0_24px_-6px_var(--listen)]",
          )}
        >
          {failed ? (
            <MicOff className="size-9" />
          ) : (
            <Mic className={cn("size-9", active && "drop-shadow-[0_0_8px_var(--listen)]")} />
          )}
        </motion.button>
      </div>

      <div className="min-h-14 w-full px-2 text-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {hasText ? (
            <motion.p
              key="transcript"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="line-clamp-3 text-lg leading-snug text-balance"
            >
              {transcript}{" "}
              <span className="text-white/60">{interim}</span>
            </motion.p>
          ) : (
            <motion.p
              key="prompt"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-lg text-white/80"
            >
              {active ? (
                <span className="inline-flex items-center gap-2">
                  <ListeningDots />
                  Listening… {prompt}
                </span>
              ) : (
                `Tap to speak · ${prompt}`
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ListeningDots() {
  return (
    <span className="inline-flex gap-1" aria-hidden>
      {[0, 0.15, 0.3].map((delay) => (
        <motion.span
          key={delay}
          className="size-1.5 rounded-full bg-listen"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.9, delay, repeat: Infinity }}
        />
      ))}
    </span>
  );
}
