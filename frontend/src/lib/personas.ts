import { HeartHandshake, Megaphone, Sofa, type LucideIcon } from "lucide-react";

export type PersonaId = "drill-sergeant" | "sarcastic-roommate" | "parent";

export interface Persona {
  id: PersonaId;
  name: string;
  tagline: string;
  icon: LucideIcon;
}

/** `id` is what gets sent to the backend to pick the agent's prompt and voice. */
export const PERSONAS: Persona[] = [
  {
    id: "drill-sergeant",
    name: "Drill Sergeant",
    tagline: "Zero excuses. Feet on the floor, now.",
    icon: Megaphone,
  },
  {
    id: "sarcastic-roommate",
    name: "Sarcastic Roommate",
    tagline: "Oh, five more minutes? Groundbreaking.",
    icon: Sofa,
  },
  {
    id: "parent",
    name: "Passive-Aggressive Parent",
    tagline: "Not angry, just disappointed.",
    icon: HeartHandshake,
  },
];

export function getPersona(id: PersonaId): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}
