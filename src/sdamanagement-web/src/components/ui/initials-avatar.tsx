import { cn } from "@/lib/utils";

const BG_COLORS = [
  "bg-slate-200",
  "bg-indigo-100",
  "bg-emerald-100",
  "bg-amber-100",
  "bg-rose-100",
];

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
} as const;

function hashName(firstName: string, lastName: string): number {
  const str = `${firstName}${lastName}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

interface InitialsAvatarProps {
  firstName: string;
  lastName: string;
  size?: "sm" | "md" | "lg";
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
          "rounded-full object-cover",
          SIZE_CLASSES[size],
          className,
        )}
      />
    );
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const bgColor = BG_COLORS[hashName(firstName, lastName) % BG_COLORS.length];

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-slate-700",
        SIZE_CLASSES[size],
        bgColor,
        className,
      )}
      role="img"
      aria-label={`${firstName} ${lastName}`}
    >
      {initials}
    </div>
  );
}
