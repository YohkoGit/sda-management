import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-[var(--radius)] border border-[var(--hairline-2)] bg-[var(--parchment-2)] px-3.5 py-2.5 text-sm font-sans text-[var(--ink)] transition-[color,background-color,border-color] duration-[var(--dur-fast)] outline-none placeholder:text-[var(--ink-4)] focus-visible:border-[var(--ink)] focus-visible:bg-[var(--parchment)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--rose)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
