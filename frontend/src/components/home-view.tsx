"use client";

import { AlarmClock, BellOff, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";
import { ChallengeSelector } from "@/components/challenge-selector";
import { PersonaSelector } from "@/components/persona-selector";
import { TerrariumBubble } from "@/components/terrarium-bubble";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/useNow";
import type { ChallengeId } from "@/lib/challenges";
import type { PersonaId } from "@/lib/personas";
import { isDaytime } from "@/lib/sky";

interface HomeViewProps {
  alarmTime: string;
  onAlarmTimeChange: (time: string) => void;
  persona: PersonaId;
  onPersonaChange: (persona: PersonaId) => void;
  challenges: ChallengeId[];
  onChallengesChange: (challenges: ChallengeId[]) => void;
  points: number;
  /** Epoch ms the armed alarm will fire at, or null when not armed. */
  fireAt: number | null;
  onArm: () => void;
  onDisarm: () => void;
  onTestNow: () => void;
}

function formatCountdown(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

/** `HH:MM` → locale parts, e.g. { clock: "7:00", period: "AM" }. */
function splitAlarmTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  const parts = timeFormat.formatToParts(d);
  const period = parts.find((p) => p.type === "dayPeriod")?.value;
  const clock = parts
    .filter((p) => p.type !== "dayPeriod")
    .map((p) => p.value)
    .join("")
    .trim();
  return { clock, period };
}

export function HomeView({
  alarmTime,
  onAlarmTimeChange,
  persona,
  onPersonaChange,
  challenges,
  onChallengesChange,
  fireAt,
  onArm,
  onDisarm,
  onTestNow,
}: HomeViewProps) {
  const now = useNow();
  const armed = fireAt !== null;
  // Default to night before hydration, matching SkyBackground's fallback.
  const day = now ? isDaytime(now) : false;
  const timeInput = useRef<HTMLInputElement>(null);
  const { clock, period } = splitAlarmTime(alarmTime);

  const openTimePicker = () => {
    const input = timeInput.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col">

      <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4 pt-10">
        <section className="flex flex-col items-center pt-2">
          <TerrariumBubble
            day={day}
            className="w-[min(68vw,30dvh,300px)]"
          />

          <div className="relative mt-5">
            <button
              type="button"
              onClick={openTimePicker}
              disabled={armed}
              className="flex items-start rounded-2xl px-3 font-sans text-[clamp(4rem,20vw,6rem)] leading-none font-light tracking-tight tabular-nums outline-none [text-shadow:0_2px_16px_rgb(0_0_0/0.15)] focus-visible:ring-3 focus-visible:ring-ring/50 enabled:cursor-pointer enabled:hover:bg-white/5"
              aria-label={`Alarm time ${clock} ${period ?? ""}. Change`}
            >
              {clock}
              {period && (
                <span className="mt-[0.2em] ml-2 text-[0.25em] font-normal tracking-normal opacity-80">
                  {period}
                </span>
              )}
            </button>
            {/* Native picker, driven by the big readout above. */}
            <input
              ref={timeInput}
              type="time"
              required
              value={alarmTime}
              onChange={(e) => e.target.value && onAlarmTimeChange(e.target.value)}
              tabIndex={-1}
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0"
            />
          </div>

          <p className="mt-1 text-sm text-white/80">
            {armed && now
              ? `Rings in ${formatCountdown(fireAt - now.getTime())}`
              : now
                ? `Now ${timeFormat.format(now)} · tap time to change`
                : " "}
          </p>
        </section>

        <fieldset disabled={armed} className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-medium tracking-wide text-white/70 uppercase">
              Who&apos;s waking you up?
            </h2>
            <PersonaSelector
              value={persona}
              onValueChange={onPersonaChange}
              disabled={armed}
            />
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xs font-medium tracking-wide text-white/70 uppercase">
                WakeUp Challenges
              </h2>
              <span className="text-xs text-white/60">
                {challenges.length === 0
                  ? "None: just talk your way out"
                  : `${challenges.length} selected`}
              </span>
            </div>
            <ChallengeSelector
              value={challenges}
              onValueChange={onChallengesChange}
              disabled={armed}
            />
          </section>
        </fieldset>
      </main>

      <footer className="flex items-center justify-center gap-2 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {armed ? (
          <Button
            size="lg"
            variant="outline"
            className="glass-light h-14 flex-1 rounded-full text-base font-semibold"
            onClick={onDisarm}
          >
            <BellOff data-icon="inline-start" />
            Cancel Alarm Routine
          </Button>
        ) : (
          <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              className="h-14 w-full rounded-full bg-white text-base font-semibold text-slate-900 shadow-lg shadow-black/15 hover:bg-white/90"
              onClick={onArm}
              disabled={!alarmTime}
            >
              <AlarmClock data-icon="inline-start" />
              Activate Alarm Routine
            </Button>
          </motion.div>
        )}
        <Button
          variant="outline"
          size="lg"
          className="glass-light size-14 rounded-full"
          onClick={onTestNow}
          aria-label="Ring now (test)"
          title="Ring now (test)"
        >
          <Play />
        </Button>
      </footer>
    </div>
  );
}
