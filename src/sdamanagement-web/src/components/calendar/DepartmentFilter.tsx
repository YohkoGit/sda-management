import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { deptSwatchColor } from "@/lib/dept-color";
import type { PublicDepartment } from "@/types/public";

interface DepartmentFilterProps {
  departments: PublicDepartment[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

function getRovingTarget(selectedIds: number[], departments: PublicDepartment[]): number | "all" {
  if (selectedIds.length === 0) return "all";
  const first = selectedIds.find((id) => departments.some((d) => d.id === id));
  return first ?? "all";
}

export default function DepartmentFilter({
  departments,
  selectedIds,
  onChange,
}: DepartmentFilterProps) {
  const { t } = useTranslation();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isAllActive = selectedIds.length === 0;
  const rovingTarget = getRovingTarget(selectedIds, departments);

  const handleToggle = useCallback(
    (id: number) => {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((d) => d !== id)
        : [...selectedIds, id];
      onChange(next);
    },
    [selectedIds, onChange]
  );

  const handleAllClick = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const toolbar = toolbarRef.current;
      if (!toolbar) return;
      const chips = Array.from(
        toolbar.querySelectorAll<HTMLButtonElement>('[role="checkbox"]')
      );
      const idx = chips.indexOf(e.target as HTMLButtonElement);
      if (idx === -1) return;

      let next = -1;
      if (e.key === "ArrowRight") next = (idx + 1) % chips.length;
      if (e.key === "ArrowLeft")
        next = (idx - 1 + chips.length) % chips.length;

      if (next >= 0) {
        e.preventDefault();
        chips[next].focus();
      }
    },
    []
  );

  const chipBase =
    "eyebrow inline-flex shrink-0 items-center gap-1.5 rounded-[2px] border px-3 py-2 min-h-[2.5rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gilt)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--parchment)]";

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={t("pages.calendar.filter.label")}
      onKeyDown={handleKeyDown}
      className="mt-4 mb-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin"
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isAllActive}
        onClick={handleAllClick}
        tabIndex={rovingTarget === "all" ? 0 : -1}
        className={[
          chipBase,
          isAllActive
            ? "bg-[var(--ink)] text-[var(--parchment)] border-[var(--ink)]"
            : "bg-transparent text-[var(--ink-2)] border-[var(--hairline-2)] hover:border-[var(--ink)] hover:bg-[var(--parchment-2)]",
        ].join(" ")}
      >
        {t("pages.calendar.filter.all")}
      </button>

      {departments.map((dept) => {
        const isActive = selectedIds.includes(dept.id);
        const swatch = deptSwatchColor({
          abbreviation: dept.abbreviation ?? undefined,
          color: dept.color ?? undefined,
        });
        return (
          <button
            key={dept.id}
            type="button"
            role="checkbox"
            aria-checked={isActive}
            onClick={() => handleToggle(dept.id)}
            tabIndex={rovingTarget === dept.id ? 0 : -1}
            className={[
              chipBase,
              isActive
                ? "bg-[var(--ink)] text-[var(--parchment)] border-[var(--ink)]"
                : "bg-transparent text-[var(--ink-2)] border-[var(--hairline-2)] hover:border-[var(--ink)] hover:bg-[var(--parchment-2)]",
            ].join(" ")}
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: swatch }}
            />
            {dept.abbreviation}
          </button>
        );
      })}
    </div>
  );
}
