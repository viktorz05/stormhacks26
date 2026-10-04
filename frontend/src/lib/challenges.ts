import { Calculator, Mic, Video, type LucideIcon } from "lucide-react";
import type { PersonaId } from "@/lib/personas";

export type ChallengeId = "show-item" | "math" | "knowledge";

export interface Challenge {
  id: ChallengeId;
  title: string;
  detail: string;
  /** What the challenge needs from the device or the user. */
  requirement: string;
  icon: LucideIcon;
}

/**
 * `id` is what gets sent to the backend. Users can stack any combination; an
 * empty list means the persona alone has to be talked down.
 */
export const CHALLENGES: Challenge[] = [
  {
    id: "show-item",
    title: "Bring an item to screen",
    detail: "e.g. your toothbrush",
    requirement: "Cam required",
    icon: Video,
  },
  {
    id: "math",
    title: "Solve 3 math problems",
    detail: "Medium level",
    requirement: "Keypad",
    icon: Calculator,
  },
  {
    id: "knowledge",
    title: "Answer a knowledge question",
    detail: "Say it out loud",
    requirement: "Speech-to-text",
    icon: Mic,
  },
];

/** Everything the backend needs to run a wake-up routine. */
export interface AlarmConfig {
  /** Local wall-clock time, `HH:MM`. */
  time: string;
  persona: PersonaId;
  challenges: ChallengeId[];
}
