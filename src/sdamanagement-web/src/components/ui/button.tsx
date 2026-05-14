import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-sans font-medium text-sm whitespace-nowrap rounded-[var(--radius)] transition-colors duration-[var(--dur-instant)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--gilt)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--parchment)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[var(--rose)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[var(--ink)] text-[var(--parchment)] hover:bg-[var(--ink-2)]",
        destructive:
          "bg-[var(--rose)] text-[var(--parchment)] hover:bg-[var(--rose)]/90",
        outline:
          "bg-transparent text-[var(--ink)] border border-[var(--hairline-2)] hover:border-[var(--ink)] hover:bg-[var(--parchment-2)]",
        secondary:
          "bg-[var(--parchment-2)] text-[var(--ink)] border border-[var(--hairline)] hover:bg-[var(--parchment-3)]",
        ghost:
          "bg-transparent text-[var(--ink)] hover:bg-[var(--parchment-2)]",
        link: "text-[var(--gilt-2)] underline-offset-4 hover:underline",
        gilt: "bg-transparent text-[var(--ink)] border border-[var(--gilt)] hover:bg-[var(--gilt-wash)]",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        xs: "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 px-7 has-[>svg]:px-5",
        icon: "size-10",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
