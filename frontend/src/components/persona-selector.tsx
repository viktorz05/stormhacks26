"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getPersona, PERSONAS, type PersonaId } from "@/lib/personas";
import { cn } from "@/lib/utils";

interface PersonaSelectorProps {
  value: PersonaId;
  onValueChange: (value: PersonaId) => void;
  disabled?: boolean;
}

/** A row of three cards; exactly one voice agent is active at a time. */
export function PersonaSelector({
  value,
  onValueChange,
  disabled,
}: PersonaSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <RadioGroup
        value={value}
        onValueChange={(v) => onValueChange(v as PersonaId)}
        disabled={disabled}
        aria-label="Who's waking you up?"
        className="grid-cols-3 gap-2"
      >
        {PERSONAS.map(({ id, name, icon: Icon }) => (
          <Label
            key={id}
            htmlFor={`persona-${id}`}
            className={cn(
              "group relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center font-normal transition-colors",
              "hover:bg-white/10 has-data-checked:border-white/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {value === id && (
              <motion.span
                layoutId="persona-active"
                className="absolute inset-0 rounded-2xl bg-white/15"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <RadioGroupItem id={`persona-${id}`} value={id} className="sr-only" />
            <span className="relative grid size-11 place-items-center rounded-full bg-white/10 transition-colors group-has-data-checked:bg-white group-has-data-checked:text-slate-900">
              <Icon className="size-5" />
            </span>
            <span className="relative text-xs leading-tight font-medium text-balance">
              {name}
            </span>
          </Label>
        ))}
      </RadioGroup>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={value}
          className="text-center text-sm text-white/75 italic"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          &ldquo;{getPersona(value).tagline}&rdquo;
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
