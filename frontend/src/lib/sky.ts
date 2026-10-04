/**
 * Time-of-day sky palette, iOS Weather style. Colours are keyframed by hour and
 * interpolated by the minute, so the sky drifts rather than snapping between
 * phases.
 */

export type SkyPhase = "night" | "dawn" | "morning" | "midday" | "sunset" | "dusk";

interface Keyframe {
  /** Hour of day, 0–24 (fractional). */
  at: number;
  /** Top, middle and bottom gradient stops as hex. */
  stops: [string, string, string];
}

// Loosely matched to the iOS Weather backgrounds: deep navy nights, peach
// dawns, clear blue days and the blue-to-apricot sunset from the screenshot.
const KEYFRAMES: Keyframe[] = [
  { at: 0, stops: ["#0b1026", "#141b3a", "#1f2a4d"] },
  { at: 4.5, stops: ["#0f1530", "#1d2550", "#33386a"] },
  { at: 6, stops: ["#2b3a6b", "#7a6f9b", "#f0a982"] },
  { at: 7.5, stops: ["#3d6aa8", "#87a6cf", "#f3c9a5"] },
  { at: 10, stops: ["#2f6fc0", "#4f8fd6", "#8cbcec"] },
  { at: 14, stops: ["#2a68b8", "#4a8ad3", "#86b8ea"] },
  { at: 17, stops: ["#2f4f8a", "#6a7bb0", "#c9a7b0"] },
  { at: 18.75, stops: ["#2c3f72", "#6b6a9e", "#e3a98a"] },
  { at: 20, stops: ["#1c2350", "#3e3a6e", "#8a5f7a"] },
  { at: 21.5, stops: ["#0e1430", "#18204a", "#2a2f5c"] },
  { at: 24, stops: ["#0b1026", "#141b3a", "#1f2a4d"] },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${c(ar, br)} ${c(ag, bg)} ${c(ab, bb)})`;
}

export function skyStops(date: Date): [string, string, string] {
  const hour = date.getHours() + date.getMinutes() / 60;
  const i = KEYFRAMES.findIndex((k) => k.at > hour);
  const to = KEYFRAMES[i];
  const from = KEYFRAMES[i - 1];
  const t = (hour - from.at) / (to.at - from.at);
  return [0, 1, 2].map((s) => mix(from.stops[s], to.stops[s], t)) as [
    string,
    string,
    string,
  ];
}

export function skyPhase(date: Date): SkyPhase {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h < 5 || h >= 21) return "night";
  if (h < 7.5) return "dawn";
  if (h < 11) return "morning";
  if (h < 17) return "midday";
  if (h < 19.5) return "sunset";
  return "dusk";
}

export const SKY_LABEL: Record<SkyPhase, string> = {
  night: "Clear night",
  dawn: "Dawn",
  morning: "Morning light",
  midday: "Sunny",
  sunset: "Sunset",
  dusk: "Dusk",
};

/** Whether the sun is up, for picking sun vs. moon artwork. */
export function isDaytime(date: Date): boolean {
  const phase = skyPhase(date);
  return phase !== "night" && phase !== "dusk";
}
