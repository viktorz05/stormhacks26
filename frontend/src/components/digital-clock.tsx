"use client";

import { useNow } from "@/hooks/useNow";
import { cn } from "@/lib/utils";

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

/**
 * The hero readout, laid out like the iOS Weather header: small title, huge
 * thin numerals, then a couple of quieter lines underneath.
 */
export function DigitalClock({
  title,
  subtitle,
  className,
}: {
  title?: string;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  const now = useNow();

  const parts = now ? timeFormat.formatToParts(now) : [];
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value;
  const hours = get("hour") ?? "--";
  const minutes = get("minute") ?? "--";
  const period = get("dayPeriod");

  const date = now
    ? now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : " ";

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center select-none [text-shadow:0_1px_12px_rgb(0_0_0/0.15)]",
        className,
      )}
    >
      {title && (
        <h1 className="text-[clamp(1.75rem,7vw,2.5rem)] leading-tight font-normal tracking-tight">
          {title}
        </h1>
      )}
      <time
        dateTime={now?.toISOString()}
        className="flex items-start font-sans text-[clamp(5.5rem,min(30vw,22dvh),12rem)] leading-none font-thin tracking-tight tabular-nums"
        aria-label={now ? timeFormat.format(now) : "Loading time"}
      >
        {hours}
        <span className="animate-pulse opacity-70">:</span>
        {minutes}
        {period && (
          <span className="mt-[0.18em] ml-2 text-[0.2em] font-light tracking-normal opacity-80">
            {period}
          </span>
        )}
      </time>
      <p className="mt-1 text-xl font-normal text-white/90">{date}</p>
      {subtitle && (
        <div className="text-lg font-medium text-white/90">{subtitle}</div>
      )}
    </div>
  );
}
