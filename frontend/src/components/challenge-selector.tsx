"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { CHALLENGES, type ChallengeId } from "@/lib/challenges";
import { cn } from "@/lib/utils";

interface ChallengeSelectorProps {
  value: ChallengeId[];
  onValueChange: (value: ChallengeId[]) => void;
  disabled?: boolean;
}

/** Multi-select: any combination of challenges can be stacked. */
export function ChallengeSelector({
  value,
  onValueChange,
  disabled,
}: ChallengeSelectorProps) {
  const toggle = (id: ChallengeId, checked: boolean) =>
    onValueChange(
      checked
        ? // Keep CHALLENGES order so the backend gets a stable sequence.
          CHALLENGES.map((c) => c.id).filter((c) => c === id || value.includes(c))
        : value.filter((c) => c !== id),
    );

  return (
    <div role="group" aria-label="WakeUp challenges" className="flex flex-col gap-2">
      {CHALLENGES.map(({ id, title, detail, requirement, icon: Icon }) => {
        const checked = value.includes(id);
        return (
          <label
            key={id}
            htmlFor={`challenge-${id}`}
            className={cn(
              "group flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors",
              "hover:bg-white/10 has-data-checked:border-white/35 has-data-checked:bg-white/15 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 transition-colors group-has-data-checked:bg-white group-has-data-checked:text-slate-900">
              <Icon className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm leading-snug font-medium">{title}</span>
              <span className="text-xs text-white/65">
                {detail} · <span className="text-white/85">{requirement}</span>
              </span>
            </span>
            <Checkbox
              id={`challenge-${id}`}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(c) => toggle(id, c === true)}
              className="size-5 rounded-md border-white/40 data-checked:border-white data-checked:bg-white data-checked:text-slate-900 dark:data-checked:bg-white"
            />
          </label>
        );
      })}
    </div>
  );
}
