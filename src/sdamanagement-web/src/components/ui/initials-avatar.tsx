import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
} as const;

interface InitialsAvatarProps {
  firstName: string;
  lastName: string;
  size?: "xs" | "sm" | "md" | "lg";
  avatarUrl?: string;
  className?: string;
}

export function InitialsAvatar({
  firstName,
  lastName,
  size = "md",
  avatarUrl,
  className,
}: InitialsAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${firstName} ${lastName}`}
        className={cn(
          "rounded-full object-cover ring-1 ring-[var(--hairline)]",
          SIZE_CLASSES[size],
          className,
        )}
      />
    );
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-[var(--parchment-3)] font-display text-[var(--ink-2)] ring-1 ring-[var(--hairline)]",
        SIZE_CLASSES[size],
        className,
      )}
      role="img"
      aria-label={`${firstName} ${lastName}`}
    >
      {initials}
    </div>
  );
}
