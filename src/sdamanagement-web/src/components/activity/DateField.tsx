import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  ariaInvalid?: boolean;
  ariaLabel?: string;
  placeholder?: string;
}

function toIso(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function parseIso(value: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function DateField({
  value,
  onChange,
  id,
  ariaInvalid,
  ariaLabel,
  placeholder,
}: DateFieldProps) {
  const { t, i18n } = useTranslation();
  const today = useMemo(() => new Date(), []);
  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());

  const selected = parseIso(value);
  const initialMonth = selected ?? today;
  const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());
  const [open, setOpen] = useState(false);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    i18n.language,
    { month: "long", year: "numeric" }
  );

  const triggerLabel = selected
    ? selected.toLocaleDateString(i18n.language, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : placeholder ?? t("pickers.date.placeholder", "Choisir une date");

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const cells: Array<{ day: number; iso: string; inMonth: boolean; isSabbath: boolean }> = [];
  for (let i = leadingBlanks; i > 0; i--) {
    const d = daysInPrev - i + 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    cells.push({
      day: d,
      iso: toIso(prevYear, prevMonth, d),
      inMonth: false,
      isSabbath: new Date(prevYear, prevMonth, d).getDay() === 6,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      iso: toIso(viewYear, viewMonth, d),
      inMonth: true,
      isSabbath: new Date(viewYear, viewMonth, d).getDay() === 6,
    });
  }
  const trailing = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= trailing; d++) {
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    cells.push({
      day: d,
      iso: toIso(nextYear, nextMonth, d),
      inMonth: false,
      isSabbath: new Date(nextYear, nextMonth, d).getDay() === 6,
    });
  }

  const stepMonth = (delta: number) => {
    const m = viewMonth + delta;
    if (m < 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else if (m > 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(m);
    }
  };

  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d
        .toLocaleDateString(i18n.language, { weekday: "narrow" })
        .toUpperCase();
    });
  }, [i18n.language]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <CalendarIcon className="h-4 w-4 shrink-0 text-[var(--ink-3)]" aria-hidden />
          <span
            className={[
              "flex-1 truncate font-sans text-sm",
              selected ? "text-[var(--ink)]" : "text-[var(--ink-4)]",
            ].join(" ")}
          >
            {triggerLabel}
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--ink-4)]" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[280px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between border-b border-[var(--hairline)] px-3 py-2.5">
          <button
            type="button"
            onClick={() => stepMonth(-1)}
            aria-label={t("pickers.date.prevMonth", "Mois précédent")}
            className="rounded-[2px] p-1 text-[var(--ink-3)] hover:bg-[var(--parchment-2)] hover:text-[var(--ink)]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="font-display text-[15px] capitalize text-[var(--ink)]">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => stepMonth(1)}
            aria-label={t("pickers.date.nextMonth", "Mois suivant")}
            className="rounded-[2px] p-1 text-[var(--ink-3)] hover:bg-[var(--parchment-2)] hover:text-[var(--ink)]"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="grid grid-cols-7 px-2 pt-2.5">
          {weekdays.map((w, i) => (
            <span
              key={i}
              className={[
                "py-1 text-center font-mono text-[10px] tracking-[0.16em]",
                i === 0 ? "text-[var(--gilt-2)]" : "text-[var(--ink-3)]",
              ].join(" ")}
            >
              {w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0 px-2 pb-1">
          {cells.map((c) => {
            const isSelected = c.iso === value;
            const isToday = c.iso === todayIso;
            return (
              <button
                key={c.iso + (c.inMonth ? "" : "-out")}
                type="button"
                onClick={() => {
                  onChange(c.iso);
                  setOpen(false);
                }}
                className={[
                  "relative flex h-9 flex-col items-center justify-center rounded-[2px] font-mono text-[11px] tabular-nums transition-colors",
                  c.inMonth ? "text-[var(--ink)]" : "text-[var(--ink-4)]",
                  isSelected
                    ? "bg-[var(--ink)] text-[var(--parchment)]"
                    : "hover:bg-[var(--parchment-2)]",
                  isToday && !isSelected ? "font-semibold" : "",
                ].join(" ")}
                aria-label={c.iso}
                aria-pressed={isSelected}
              >
                {c.day}
                {c.isSabbath && !isSelected && (
                  <span
                    aria-hidden
                    className="absolute bottom-1 h-[3px] w-[3px] rounded-full bg-[var(--gilt)]"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--hairline)] px-3 py-2">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--gilt)]" aria-hidden />
            {t("pickers.date.sabbathLegend", "Sabbat")}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(todayIso);
              setViewYear(today.getFullYear());
              setViewMonth(today.getMonth());
            }}
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--gilt-2)] hover:text-[var(--ink)]"
          >
            {t("pickers.date.today", "Aujourd'hui")} · {today.getDate()}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
