import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Eyebrow — micro-label / kicker text in IBM Plex Mono uppercase.
 * Apply `.eyebrow` (ink-3) by default, or pass `gilt` for the candle-gold variant.
 */
export function Eyebrow({
  className,
  gilt = false,
  ...props
}: React.ComponentProps<"div"> & { gilt?: boolean }) {
  return (
    <div
      data-slot="eyebrow"
      className={cn("eyebrow", gilt && "eyebrow-gilt", className)}
      {...props}
    />
  )
}

/**
 * Wordmark — the SDAC publication-style brand mark.
 * Two-line lockup: Spectral "Saint-Hubert" + mono caps subtitle.
 */
export function Wordmark({
  className,
  size = "default",
  subtitle = "Église Adventiste · 2026",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm" | "lg"
  subtitle?: string
}) {
  return (
    <div
      data-slot="wordmark"
      className={cn("flex flex-col leading-none", className)}
      {...props}
    >
      <span
        className={cn(
          "font-display font-normal italic tracking-tight text-[var(--ink)]",
          size === "sm" && "text-xl",
          size === "default" && "text-2xl",
          size === "lg" && "text-3xl"
        )}
      >
        Saint-Hubert
      </span>
      <span className="eyebrow eyebrow-gilt mt-1.5">{subtitle}</span>
    </div>
  )
}

/**
 * Numerator — large Spectral display number for dates / statistics.
 * Use with text-{size} to scale (e.g. text-5xl, text-7xl).
 */
export function Numerator({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="numerator"
      className={cn("numerator", className)}
      {...props}
    />
  )
}

/**
 * DateBlock — numerator + weekday + month/year stack used in many places.
 * Compact: small numerator on left of a row.
 * Featured: huge numerator above an italic month line.
 */
export function DateBlock({
  date,
  variant = "compact",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  date: Date
  variant?: "compact" | "featured"
}) {
  const weekday = date.toLocaleDateString("fr-FR", { weekday: "short" })
  const month = date.toLocaleDateString("fr-FR", { month: "short" })
  const day = date.getDate()
  const year = date.getFullYear()

  if (variant === "featured") {
    return (
      <div
        data-slot="date-block"
        className={cn("flex flex-col leading-none", className)}
        {...props}
      >
        <span className="numerator text-[120px] md:text-[160px]">{day}</span>
        <span className="mt-2 font-display text-2xl italic text-[var(--ink-2)]">
          {month} {year}
        </span>
      </div>
    )
  }

  return (
    <div
      data-slot="date-block"
      className={cn("flex flex-col items-start leading-none", className)}
      {...props}
    >
      <span className="numerator text-4xl md:text-5xl">{day}</span>
      <span className="eyebrow mt-1.5">{weekday}</span>
    </div>
  )
}

/**
 * Hairline rule — preferred over <Separator> for typographic layouts.
 */
export function Rule({
  className,
  thick = false,
  vertical = false,
  ...props
}: React.ComponentProps<"hr"> & { thick?: boolean; vertical?: boolean }) {
  if (vertical) {
    return (
      <div
        data-slot="rule"
        aria-hidden
        className={cn(
          "w-px self-stretch",
          thick ? "bg-[var(--ink)]" : "bg-[var(--hairline)]",
          className
        )}
      />
    )
  }
  return (
    <hr
      data-slot="rule"
      className={cn(
        "h-px w-full border-0",
        thick ? "bg-[var(--ink)]" : "bg-[var(--hairline)]",
        className
      )}
      {...props}
    />
  )
}

/**
 * Serial — small monospaced index number for ordered lists (01, 02, 03 ...).
 */
export function Serial({
  n,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & { n: number }) {
  return (
    <span
      data-slot="serial"
      className={cn("font-mono text-[11px] tabular-nums text-[var(--ink-4)]", className)}
      {...props}
    >
      {String(n).padStart(2, "0")}
    </span>
  )
}
