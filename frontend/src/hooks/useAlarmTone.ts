"use client";

import { useCallback, useEffect, useRef } from "react";

// Classic digital-alarm pattern: four quick beeps, then a pause.
const BEEP_HZ = 880;
const BEEP_S = 0.09;
const GAP_S = 0.06;
const BEEPS = 4;
const CYCLE_MS = 1000;

/**
 * Synthesized alarm beeper. Browsers only allow audio after a user gesture, so
 * call `unlock()` from a click handler (e.g. "Set alarm") well before the
 * alarm needs to ring.
 */
export function useAlarmTone() {
  const contextRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unlock = useCallback(() => {
    if (!contextRef.current) {
      const context = new AudioContext();
      const master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      contextRef.current = context;
      masterRef.current = master;
    }
    void contextRef.current.resume();
  }, []);

  const playCycle = useCallback(() => {
    const context = contextRef.current;
    const master = masterRef.current;
    if (!context || !master) return;

    const t0 = context.currentTime + 0.02;
    for (let i = 0; i < BEEPS; i++) {
      const start = t0 + i * (BEEP_S + GAP_S);
      const osc = context.createOscillator();
      const env = context.createGain();
      osc.type = "square";
      osc.frequency.value = BEEP_HZ;
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(1, start + 0.005);
      env.gain.setValueAtTime(1, start + BEEP_S - 0.01);
      env.gain.linearRampToValueAtTime(0, start + BEEP_S);
      osc.connect(env).connect(master);
      osc.start(start);
      osc.stop(start + BEEP_S);
    }
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const start = useCallback(() => {
    unlock();
    if (intervalRef.current) return;
    playCycle();
    intervalRef.current = setInterval(playCycle, CYCLE_MS);
  }, [unlock, playCycle]);

  /** 0–1. Use to duck the alarm while the user is talking to the agent. */
  const setLevel = useCallback((level: number) => {
    const context = contextRef.current;
    const master = masterRef.current;
    if (!context || !master) return;
    master.gain.setTargetAtTime(level * 0.35, context.currentTime, 0.1);
  }, []);

  useEffect(
    () => () => {
      stop();
      void contextRef.current?.close();
      contextRef.current = null;
    },
    [stop],
  );

  return { unlock, start, stop, setLevel };
}
