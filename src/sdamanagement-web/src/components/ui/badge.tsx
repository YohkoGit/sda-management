import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden font-mono text-[10px] uppercase tracking-[0.14em] whitespace-nowrap rounded-[2px] border px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--gilt)] focus-visible:ring-offset-1 aria-invalid:border-[var(--rose)] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-[var(--parchment)] text-[var(--ink-2)] border-[var(--hairline-2)] [a&]:hover:bg-[var(--parchment-2)]",
        secondary:
          "bg-[var(--parchment-2)] text-[var(--ink-2)] border-[var(--hairline)] [a&]:hover:bg-[var(--parchment-3)]",
        destructive:
          "bg-[var(--rose)] text-[var(--parchment)] border-[var(--rose)]",
        outline:
          "border-[var(--hairline-2)] text-[var(--ink-2)] bg-transparent [a&]:hover:bg-[var(--parchment-2)]",
        ghost: "border-transparent text-[var(--ink-2)] [a&]:hover:bg-[var(--parchment-2)]",
        link: "text-[var(--gilt-2)] border-transparent underline-offset-4 [a&]:hover:underline",
        gilt: "bg-[var(--gilt-wash)] text-[var(--gilt-2)] border-[var(--gilt-soft)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
