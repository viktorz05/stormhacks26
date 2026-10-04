"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, CheckCircle2, Loader2, RotateCcw, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { verifyWakeUp, type VerifyResponse } from "@/lib/verify";
import { cn } from "@/lib/utils";

type Stage =
  | { kind: "starting" }
  | { kind: "live" }
  | { kind: "verifying"; frame: string }
  | { kind: "result"; frame: string; result: VerifyResponse }
  | { kind: "error"; message: string; frame?: string };

interface VerifyWakeModalProps {
  open: boolean;
  /** Object Gemini should look for. */
  target?: string;
  onClose: () => void;
  onVerified: () => void;
}

const JPEG_QUALITY = 0.8;
// Plenty for object recognition, and keeps the upload small.
const MAX_EDGE = 1024;

/** Draw the current video frame to a canvas and return JPEG Base64 (no prefix). */
function captureFrame(video: HTMLVideoElement): string {
  const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1];
}

export function VerifyWakeModal({
  open,
  target = "toothbrush",
  onClose,
  onVerified,
}: VerifyWakeModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="verify-modal"
          role="dialog"
          aria-modal
          aria-label="Verify you're awake"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 backdrop-blur-md sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="glass w-full max-w-md overflow-hidden rounded-[2rem] pb-[env(safe-area-inset-bottom)]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <CameraPanel target={target} onClose={onClose} onVerified={onVerified} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CameraPanel({
  target,
  onClose,
  onVerified,
}: {
  target: string;
  onClose: () => void;
  onVerified: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "starting" });

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setStage({ kind: "starting" });
    if (!navigator.mediaDevices?.getUserMedia) {
      setStage({ kind: "error", message: "Camera needs a secure context (https or localhost)." });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setStage({ kind: "live" });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setStage({
        kind: "error",
        message:
          name === "NotAllowedError"
            ? "Camera permission was denied."
            : name === "NotFoundError"
              ? "No camera found."
              : err instanceof Error
                ? err.message
                : String(err),
      });
    }
  }, []);

  useEffect(() => {
    // Opening the camera is the whole point of mounting this panel.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void startCamera();
    return () => {
      abortRef.current?.abort();
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const frame = captureFrame(video);
    stopCamera(); // One frame is all we need; free the camera.
    setStage({ kind: "verifying", frame });

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await verifyWakeUp(frame, target, controller.signal);
      setStage({ kind: "result", frame, result });
      if (result.verified) setTimeout(onVerified, 1200);
    } catch (err) {
      if (controller.signal.aborted) return;
      setStage({
        kind: "error",
        frame,
        message: err instanceof Error ? err.message : "Couldn't reach the server.",
      });
    }
  };

  const frame = "frame" in stage ? stage.frame : undefined;
  const verified = stage.kind === "result" && stage.result.verified;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-xs font-medium tracking-wide text-white/60 uppercase">
            Visual proof
          </p>
          <h2 className="text-lg font-medium">Show me your {target}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="glass-light grid size-9 place-items-center rounded-full"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-black/40">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn("size-full object-cover", frame && "hidden")}
        />
        {frame && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/jpeg;base64,${frame}`}
            alt="Captured frame"
            className="size-full object-cover"
          />
        )}

        {stage.kind === "starting" && (
          <Overlay>
            <Loader2 className="size-8 animate-spin" />
            <span>Starting camera…</span>
          </Overlay>
        )}

        {stage.kind === "verifying" && (
          <Overlay>
            <ScanLine />
            <Loader2 className="size-8 animate-spin" />
            <span>Gemini is checking for a {target}…</span>
          </Overlay>
        )}

        {stage.kind === "result" && (
          <Overlay tone={verified ? "good" : "bad"}>
            {verified ? (
              <CheckCircle2 className="size-12 text-emerald-300" />
            ) : (
              <XCircle className="size-12 text-rose-300" />
            )}
            <span className="text-lg font-medium">
              {verified ? "You're up. Alarm off." : `That's not a ${target}.`}
            </span>
            {stage.result.reason && (
              <span className="max-w-xs text-sm text-white/80">{stage.result.reason}</span>
            )}
          </Overlay>
        )}

        {stage.kind === "error" && (
          <Overlay tone="bad">
            <XCircle className="size-10 text-rose-300" />
            <span className="max-w-xs text-sm">{stage.message}</span>
          </Overlay>
        )}
      </div>

      {stage.kind === "live" || stage.kind === "starting" ? (
        <button
          type="button"
          onClick={capture}
          disabled={stage.kind !== "live"}
          className="glass-light mx-auto flex h-14 items-center gap-2 rounded-full px-8 text-base font-semibold transition-opacity disabled:opacity-50"
        >
          <Camera className="size-5" />
          Capture
        </button>
      ) : stage.kind === "verifying" ? (
        <p className="h-14 text-center text-sm leading-[3.5rem] text-white/70">
          Hold tight, this takes a few seconds.
        </p>
      ) : verified ? (
        <div className="h-14" />
      ) : (
        <button
          type="button"
          onClick={startCamera}
          className="glass-light mx-auto flex h-14 items-center gap-2 rounded-full px-8 text-base font-semibold"
        >
          <RotateCcw className="size-5" />
          Try again
        </button>
      )}
    </div>
  );
}

function Overlay({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "good" | "bad";
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center backdrop-blur-sm",
        tone === "good" ? "bg-emerald-950/40" : tone === "bad" ? "bg-rose-950/40" : "bg-black/35",
      )}
      aria-live="polite"
    >
      {children}
    </motion.div>
  );
}

function ScanLine() {
  return (
    <motion.span
      aria-hidden
      className="absolute inset-x-0 h-0.5 bg-listen shadow-[0_0_16px_2px_var(--listen)]"
      initial={{ top: "0%" }}
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
