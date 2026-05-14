import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-[var(--radius)] border border-[var(--hairline-2)] bg-[var(--parchment-2)] px-3.5 py-2 text-sm font-sans text-[var(--ink)] transition-[color,background-color,border-color] duration-[var(--dur-fast)] outline-none placeholder:text-[var(--ink-4)] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--ink)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[var(--ink)] focus-visible:bg-[var(--parchment)]",
        "aria-invalid:border-[var(--rose)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
