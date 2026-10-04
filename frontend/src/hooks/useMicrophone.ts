"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PCM_SAMPLE_RATE } from "@/lib/audio";

export type MicStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "denied"
  | "unsupported"
  | "error";

export interface UseMicrophoneOptions {
  /**
   * Called with each raw 16kHz mono PCM16 (little-endian) chunk. This is the
   * Phase 2 hook point: `ws.send(chunk)` for binary frames, or
   * `ws.send(JSON.stringify({ user_audio_chunk: pcmToBase64(chunk) }))` for
   * ElevenLabs. Read through a ref, so passing an inline function is fine.
   */
  onPcmChunk?: (chunk: ArrayBuffer) => void;
  /** Chunk length in ms. Read when `start()` is called. Default 100. */
  chunkDurationMs?: number;
}

export interface UseMicrophone {
  status: MicStatus;
  /** Smoothed input level, 0–100. */
  volume: number;
  /** The raw MediaStream while listening, for anything else that needs it. */
  stream: MediaStream | null;
  error: string | null;
  isListening: boolean;
  /** True once the 16kHz PCM pipeline is running and chunks will flow. */
  pcmReady: boolean;
  /** Sample rate of the chunks passed to `onPcmChunk`. */
  pcmSampleRate: number;
  start: () => Promise<void>;
  stop: () => void;
}

const WORKLET_URL = "/worklets/pcm16-processor.js";
const WORKLET_TIMEOUT_MS = 5000;

// Map RMS (in dBFS) onto 0–100. Room silence sits around -60dB, close speech
// peaks near -10dB.
const MIN_DB = -60;
const MAX_DB = -10;
// Exponential smoothing: fast attack so speech feels responsive, slow release
// so the orb doesn't flicker between syllables.
const ATTACK = 0.5;
const RELEASE = 0.12;

interface Session {
  stream: MediaStream;
  context: AudioContext;
  nodes: AudioNode[];
  worklet: AudioWorkletNode | null;
  raf: number;
}

/**
 * Load the PCM16 worklet and splice it into the session's graph. Resolves
 * false if the session was torn down meanwhile.
 */
async function attachPcmWorklet(
  session: Session,
  source: MediaStreamAudioSourceNode,
  chunkMs: number,
  onChunk: (chunk: ArrayBuffer) => void,
): Promise<boolean> {
  const { context } = session;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    context.audioWorklet.addModule(WORKLET_URL),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Timed out loading PCM worklet")),
        WORKLET_TIMEOUT_MS,
      );
    }),
  ]).finally(() => clearTimeout(timer));

  if (context.state === "closed") return false;

  const worklet = new AudioWorkletNode(context, "pcm16-processor", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 1,
    channelCountMode: "explicit",
    processorOptions: {
      targetSampleRate: PCM_SAMPLE_RATE,
      chunkSamples: Math.round((PCM_SAMPLE_RATE * chunkMs) / 1000),
    },
  });
  worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) =>
    onChunk(event.data);

  // The worklet only gets pulled if it reaches the destination; route it
  // through a muted gain so the user doesn't hear themselves.
  const sink = context.createGain();
  sink.gain.value = 0;
  source.connect(worklet);
  worklet.connect(sink);
  sink.connect(context.destination);

  session.worklet = worklet;
  session.nodes.push(worklet, sink);
  return true;
}

export function useMicrophone(
  options: UseMicrophoneOptions = {},
): UseMicrophone {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [volume, setVolume] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pcmReady, setPcmReady] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const startingRef = useRef(false);
  // Bumped by stop()/unmount so an in-flight start() knows to bail out.
  const generationRef = useRef(0);
  const onPcmChunkRef = useRef(options.onPcmChunk);
  const chunkMsRef = useRef(options.chunkDurationMs ?? 100);

  useEffect(() => {
    onPcmChunkRef.current = options.onPcmChunk;
    chunkMsRef.current = options.chunkDurationMs ?? 100;
  });

  const teardown = useCallback(() => {
    generationRef.current++;
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;

    cancelAnimationFrame(session.raf);
    if (session.worklet) {
      session.worklet.port.onmessage = null;
      session.worklet.port.close();
    }
    session.nodes.forEach((node) => node.disconnect());
    session.stream.getTracks().forEach((track) => track.stop());
    void session.context.close();
  }, []);

  const stop = useCallback(() => {
    teardown();
    setStream(null);
    setPcmReady(false);
    setVolume(0);
    setStatus("idle");
  }, [teardown]);

  const start = useCallback(async () => {
    if (sessionRef.current || startingRef.current) return;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setStatus("unsupported");
      setError(
        "Microphone access needs a secure context (https or localhost).",
      );
      return;
    }

    startingRef.current = true;
    const generation = generationRef.current;
    setStatus("requesting");
    setError(null);

    let media: MediaStream | null = null;
    let context: AudioContext | null = null;

    try {
      media = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          // The alarm and the AI voice play through the speaker, so let the
          // browser cancel them out of the mic signal.
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Run at the hardware rate and resample in the worklet: Firefox refuses to
      // connect a mic stream to a context with a different sample rate.
      context = new AudioContext({ latencyHint: "interactive" });
      if (context.state === "suspended") await context.resume();

      const source = context.createMediaStreamSource(media);

      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);

      const nodes: AudioNode[] = [source, analyser];

      if (generation !== generationRef.current) {
        // stop() was called (or we unmounted) while waiting on permission.
        nodes.forEach((node) => node.disconnect());
        media.getTracks().forEach((track) => track.stop());
        void context.close();
        return;
      }

      const samples = new Float32Array(analyser.fftSize);
      let level = 0;
      let lastEmitted = -1;

      const session: Session = {
        stream: media,
        context,
        nodes,
        worklet: null,
        raf: 0,
      };

      const tick = () => {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
        const rms = Math.sqrt(sum / samples.length);
        const db = rms > 0 ? 20 * Math.log10(rms) : MIN_DB;
        const target =
          Math.min(1, Math.max(0, (db - MIN_DB) / (MAX_DB - MIN_DB))) * 100;

        level += (target - level) * (target > level ? ATTACK : RELEASE);
        const rounded = Math.round(level);
        if (rounded !== lastEmitted) {
          lastEmitted = rounded;
          setVolume(rounded);
        }
        session.raf = requestAnimationFrame(tick);
      };

      // If the user revokes the mic or unplugs it, drop back to idle.
      media.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (sessionRef.current === session) stop();
        };
      });

      sessionRef.current = session;
      session.raf = requestAnimationFrame(tick);

      setStream(media);
      setStatus("listening");

      // PCM capture is attached after the meter is live, so a slow (or stuck)
      // worklet load never holds up the UI.
      attachPcmWorklet(session, source, chunkMsRef.current, (chunk) =>
        onPcmChunkRef.current?.(chunk),
      ).then(
        (ok) => {
          if (ok && sessionRef.current === session) setPcmReady(true);
        },
        (workletError) => {
          if (sessionRef.current !== session) return;
          // The volume meter still works without PCM capture.
          console.error("[useMicrophone] PCM worklet failed", workletError);
        },
      );
    } catch (err) {
      media?.getTracks().forEach((track) => track.stop());
      void context?.close();

      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setError("Microphone permission was denied.");
      } else if (name === "NotFoundError") {
        setStatus("error");
        setError("No microphone found.");
      } else {
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      startingRef.current = false;
    }
  }, [stop]);

  useEffect(() => teardown, [teardown]);

  return {
    status,
    volume,
    stream,
    error,
    isListening: status === "listening",
    pcmReady,
    pcmSampleRate: PCM_SAMPLE_RATE,
    start,
    stop,
  };
}
