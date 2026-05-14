import { ToggleGroup } from "radix-ui";
import { Check } from "lucide-react";

export interface TagOption<T extends string = string> {
  value: T;
  label: string;
}

interface TagPickerProps<T extends string = string> {
  value: T | null;
  onChange: (value: T | null) => void;
  options: TagOption<T>[];
  noneLabel?: string;
  ariaLabel?: string;
}

export function TagPicker<T extends string = string>({
  value,
  onChange,
  options,
  noneLabel,
  ariaLabel,
}: TagPickerProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value ?? "__none__"}
      onValueChange={(v) => {
        if (!v || v === "__none__") {
          onChange(null);
        } else {
          onChange(v as T);
        }
      }}
      aria-label={ariaLabel}
      className="flex flex-wrap gap-1.5"
    >
      {noneLabel && (
        <ToggleGroup.Item value="__none__" asChild>
          <button
            type="button"
            className={[
              "inline-flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
              value === null
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--parchment)]"
                : "border-[var(--hairline-2)] bg-transparent text-[var(--ink-2)] hover:border-[var(--ink)] hover:bg-[var(--parchment-2)]",
            ].join(" ")}
          >
            {value === null && <Check className="h-3 w-3" aria-hidden />}
            {noneLabel}
          </button>
        </ToggleGroup.Item>
      )}
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <ToggleGroup.Item key={opt.value} value={opt.value} asChild>
            <button
              type="button"
              className={[
                "inline-flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                active
                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--parchment)]"
                  : "border-[var(--hairline-2)] bg-transparent text-[var(--ink-2)] hover:border-[var(--ink)] hover:bg-[var(--parchment-2)]",
              ].join(" ")}
            >
              {active && <Check className="h-3 w-3" aria-hidden />}
              {opt.label}
            </button>
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
