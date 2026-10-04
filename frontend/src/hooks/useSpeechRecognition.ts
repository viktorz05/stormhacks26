"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API isn't in TypeScript's DOM lib yet; just what we use.
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechRecognition {
  supported: boolean;
  listening: boolean;
  /** Everything finalised so far this session. */
  transcript: string;
  /** The in-progress phrase, still being revised by the recogniser. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

/**
 * Live on-device speech-to-text via the Web Speech API (Chrome, Edge, Safari).
 * Used for on-screen feedback while the user pleads their case; the raw audio
 * still goes to the backend through useMicrophone.
 */
export function useSpeechRecognition(): UseSpeechRecognition {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Chrome ends sessions on its own after silence; restart until told to stop.
  const wantedRef = useRef(false);

  useEffect(() => {
    // Feature detection has to wait for the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    wantedRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || wantedRef.current) return;

    recognitionRef.current?.abort();
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (finalText) {
        setTranscript((prev) => `${prev} ${finalText}`.trim());
      }
      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are routine; the onend restart handles them.
      if (event.error === "no-speech" || event.error === "aborted") return;
      wantedRef.current = false;
      setError(
        event.error === "not-allowed"
          ? "Speech recognition permission was denied."
          : `Speech recognition error: ${event.error}`,
      );
    };

    recognition.onend = () => {
      // A recogniser aborted by a newer start() must not restart or reset.
      if (recognitionRef.current !== recognition) return;
      if (wantedRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // Fall through to stopped.
        }
      }
      wantedRef.current = false;
      setListening(false);
      setInterim("");
    };

    wantedRef.current = true;
    setError(null);
    setTranscript("");
    setInterim("");
    try {
      recognition.start();
      setListening(true);
    } catch (err) {
      wantedRef.current = false;
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(
    () => () => {
      wantedRef.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  return { supported, listening, transcript, interim, error, start, stop };
}
