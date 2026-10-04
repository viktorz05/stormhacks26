"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { ActiveAlarmView } from "@/components/active-alarm-view";
import { HomeView } from "@/components/home-view";
import { VerifyWakeModal } from "@/components/verify-wake-modal";
import { useAlarmTone } from "@/hooks/useAlarmTone";
import { useMicrophone } from "@/hooks/useMicrophone";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useWakeLock } from "@/hooks/useWakeLock";
import type { AlarmConfig, ChallengeId } from "@/lib/challenges";
import type { PersonaId } from "@/lib/personas";

type Phase = "idle" | "armed" | "ringing" | "negotiating";

const IS_DEV = process.env.NODE_ENV === "development";

/** Next epoch ms that the wall clock reads `HH:MM` (today, or tomorrow). */
function nextOccurrence(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
  return target.getTime();
}

export function WakeUpApp() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [alarmTime, setAlarmTime] = useState("07:00");
  const [persona, setPersona] = useState<PersonaId>("drill-sergeant");
  const [challenges, setChallenges] = useState<ChallengeId[]>(["show-item"]);
  // Placeholder until points come from the backend.
  const [fireAt, setFireAt] = useState<number | null>(null);
  const [pcmChunks, setPcmChunks] = useState(0);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const tone = useAlarmTone();
  const mic = useMicrophone({
    onPcmChunk: () => {
      // Phase 2: stream to the backend here, e.g.
      //   socket.send(chunk)                                         // binary
      //   socket.send(JSON.stringify({ user_audio_chunk: pcmToBase64(chunk) }))
      setPcmChunks((n) => n + 1);
    },
  });

  const speech = useSpeechRecognition();

  useWakeLock(phase !== "idle");

  const ring = useCallback(() => {
    setFireAt(null);
    setPhase("ringing");
    tone.start();
  }, [tone]);

  // Poll rather than one long setTimeout: timers drift or get throttled over
  // hours, the wall clock doesn't.
  useEffect(() => {
    if (phase !== "armed" || fireAt === null) return;
    const id = setInterval(() => {
      if (Date.now() >= fireAt) ring();
    }, 500);
    return () => clearInterval(id);
  }, [phase, fireAt, ring]);

  const arm = () => {
    tone.unlock(); // This click is our one chance to get audio permission.
    const config: AlarmConfig = { time: alarmTime, persona, challenges };
    // Phase 2: register the routine with the backend, e.g.
    //   fetch("/api/alarms", { method: "POST", body: JSON.stringify(config) })
    void config;
    setFireAt(nextOccurrence(alarmTime));
    setPhase("armed");
  };

  const disarm = () => {
    setFireAt(null);
    setPhase("idle");
  };

  const testNow = () => {
    tone.unlock();
    ring();
  };

  const stopAlarm = () => {
    // Hitting Stop doesn't stop anything: it opens the negotiation. Duck the
    // alarm so the user can be heard.
    setPhase("negotiating");
    setPcmChunks(0);
    tone.setLevel(0.15);
    void mic.start();
    speech.start();
  };

  const toggleMic = () => {
    if (mic.isListening) {
      mic.stop();
      speech.stop();
    } else {
      void mic.start();
      speech.start();
    }
  };

  const dismiss = () => {
    setVerifyOpen(false);
    mic.stop();
    speech.stop();
    tone.stop();
    tone.setLevel(1);
    setPhase("idle");
  };

  const active = phase === "ringing" || phase === "negotiating";

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active ? "active" : "home"}
          className="h-full"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.25 }}
        >
          {active ? (
            <ActiveAlarmView
              persona={persona}
              stage={phase === "ringing" ? "ringing" : "negotiating"}
              volume={mic.volume}
              micStatus={mic.status}
              micError={mic.error}
              onStopAlarm={stopAlarm}
              onToggleMic={toggleMic}
              transcript={speech.transcript}
              interim={speech.interim}
              onVerify={() => setVerifyOpen(true)}
              onForceDismiss={IS_DEV ? dismiss : undefined}
              pcmChunks={IS_DEV ? pcmChunks : undefined}
            />
          ) : (
            <HomeView
              alarmTime={alarmTime}
              onAlarmTimeChange={setAlarmTime}
              persona={persona}
              onPersonaChange={setPersona}
              challenges={challenges}
              onChallengesChange={setChallenges}
              fireAt={fireAt}
              onArm={arm}
              onDisarm={disarm}
              onTestNow={testNow}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <VerifyWakeModal
        open={verifyOpen}
        target="toothbrush"
        onClose={() => setVerifyOpen(false)}
        onVerified={dismiss}
      />
    </>
  );
}
