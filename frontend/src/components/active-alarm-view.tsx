"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ScanEye, X } from "lucide-react";
import { DigitalClock } from "@/components/digital-clock";
import { MicButton } from "@/components/mic-button";
import { VoiceVisualizer } from "@/components/voice-visualizer";
import { Button } from "@/components/ui/button";
import type { MicStatus } from "@/hooks/useMicrophone";
import { getPersona, type PersonaId } from "@/lib/personas";

interface ActiveAlarmViewProps {
  persona: PersonaId;
  /** "ringing" until the user hits Stop, then "negotiating" with the agent. */
  stage: "ringing" | "negotiating";
  volume: number;
  micStatus: MicStatus;
  micError: string | null;
  onStopAlarm: () => void;
  onToggleMic: () => void;
  /** Live speech-to-text for on-screen feedback. */
  transcript: string;
  interim: string;
  /** Opens the camera to prove you're up. */
  onVerify: () => void;
  /** Dev-only escape hatch until the backend can grant dismissal. */
  onForceDismiss?: () => void;
  /** Dev readout: PCM chunks captured this session. */
  pcmChunks?: number;
}

export function ActiveAlarmView({
  persona,
  stage,
  volume,
  micStatus,
  micError,
  onStopAlarm,
  onToggleMic,
  transcript,
  interim,
  onVerify,
  onForceDismiss,
  pcmChunks,
}: ActiveAlarmViewProps) {
  const { name, icon: Icon } = getPersona(persona);
  const listening = stage === "negotiating" && micStatus === "listening";
  const micFailed =
    micStatus === "denied" ||
    micStatus === "error" ||
    micStatus === "unsupported";

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col items-center gap-4 px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <DigitalClock
        title={stage === "ringing" ? "Rise and shine" : "Make your case"}
        subtitle={
          <span className="flex items-center justify-center gap-1.5">
            <Icon className="size-4" />
            {name}
          </span>
        }
      />

      <AnimatePresence mode="wait" initial={false}>
        {stage === "ringing" ? (
          <motion.div
            key="ringing"
            className="flex w-full flex-1 flex-col items-center justify-end gap-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <VoiceVisualizer volume={0} mode="ringing" className="w-48 sm:w-56" />
            <Button
              size="lg"
              onClick={onStopAlarm}
              className="h-16 w-full rounded-full bg-alarm text-lg font-semibold text-white shadow-[0_0_40px_-8px_var(--alarm)] hover:bg-alarm/90"
            >
              Stop Alarm
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="negotiating"
            className="flex w-full flex-1 flex-col justify-end gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <section className="glass rounded-3xl px-4 pt-5 pb-3">
              <MicButton
                active={listening}
                volume={volume}
                failed={micFailed}
                disabled={micStatus === "requesting"}
                onToggle={onToggleMic}
                transcript={transcript}
                interim={interim}
                prompt={micFailed ? undefined : "Ask for more time…"}
              />
              {micFailed && (
                <p className="pb-2 text-center text-sm text-rose-200">
                  {micError ?? "Couldn't reach your microphone."} Tap to retry.
                </p>
              )}
            </section>

            <section className="glass flex items-center gap-3 rounded-3xl p-4">
              <div className="flex-1">
                <p className="text-xs font-medium tracking-wide text-white/60 uppercase">
                  Or skip the debate
                </p>
                <p className="text-sm text-white/90">Prove you&apos;re up with a photo.</p>
              </div>
              <button
                type="button"
                onClick={onVerify}
                className="glass-light flex h-12 shrink-0 items-center gap-2 rounded-full px-5 font-semibold transition-colors hover:bg-white/25"
              >
                <ScanEye className="size-5" />
                Verify Wake Up
              </button>
            </section>

            {onForceDismiss && (
              <div className="flex items-center justify-center gap-3 text-xs text-white/60">
                {pcmChunks !== undefined && (
                  <span className="font-mono tabular-nums">
                    16kHz PCM · {pcmChunks} chunks
                  </span>
                )}
                <Button variant="ghost" size="xs" onClick={onForceDismiss}>
                  <X data-icon="inline-start" />
                  Dismiss (dev)
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
