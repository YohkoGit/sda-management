import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimeFieldProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  ariaInvalid?: boolean;
  ariaLabel?: string;
  label?: string;
  placeholder?: string;
}

function buildSlots() {
  const out: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

function formatDisplay(value: string, lang: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return "";
  const [h, m] = value.split(":");
  if (lang.startsWith("fr")) return `${h} h ${m}`;
  return `${h}:${m}`;
}

const SLOTS = buildSlots();

export function TimeField({
  value,
  onChange,
  id,
  ariaInvalid,
  ariaLabel,
  label,
  placeholder,
}: TimeFieldProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const display = formatDisplay(value, i18n.language);
  const triggerLabel = display || placeholder || t("pickers.time.placeholder", "Choisir");

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(value ?? ""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel ?? triggerLabel}
          className={[
            "field-shell w-full text-left",
            ariaInvalid ? "border-[var(--rose)]" : "",
          ].join(" ")}
        >
          <Clock className="h-4 w-4 shrink-0 text-[var(--ink-3)]" aria-hidden />
          <span
            className={[
              "flex-1 truncate font-mono text-sm tabular-nums",
              value ? "text-[var(--ink)]" : "text-[var(--ink-4)]",
            ].join(" ")}
          >
            {triggerLabel}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-0">
        <div className="flex items-center justify-between border-b border-[var(--hairline)] px-3 py-2.5">
          <span className="eyebrow">{label ?? t("pickers.time.label", "Heure")}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
            {t("pickers.time.step", "Pas de 15 min")}
          </span>
        </div>

        <div className="max-h-[220px] overflow-y-auto px-2 pb-2 pt-2">
          <div className="grid grid-cols-4 gap-1">
            {SLOTS.map((slot) => {
              const active = slot === value;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    onChange(slot);
                    setOpen(false);
                  }}
                  className={[
                    "rounded-[2px] border px-1 py-1.5 font-mono text-[11px] tabular-nums transition-colors",
                    active
                      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--parchment)]"
                      : "border-[var(--hairline-2)] text-[var(--ink-2)] hover:border-[var(--ink)] hover:bg-[var(--parchment-2)]",
                  ].join(" ")}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[var(--hairline)] px-3 py-2.5">
          <label className="eyebrow block">
            {t("pickers.time.custom", "Heure précise")}
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="time"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 rounded-[2px] border border-[var(--hairline-2)] bg-[var(--parchment-2)] px-2 py-1 font-mono text-sm tabular-nums text-[var(--ink)] focus:border-[var(--ink)] focus:bg-[var(--parchment)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (/^\d{2}:\d{2}$/.test(draft)) {
                  onChange(draft);
                  setOpen(false);
                }
              }}
              className="rounded-[2px] border border-[var(--ink)] bg-[var(--ink)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--parchment)] hover:bg-[var(--ink-2)]"
            >
              {t("pickers.time.apply", "OK")}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
