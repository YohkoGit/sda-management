import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { PublicDepartment } from "@/types/public";

interface DepartmentFilterProps {
  departments: PublicDepartment[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

/** Return the single tabIndex=0 target for roving tabindex (WAI-ARIA toolbar). */
function getRovingTarget(selectedIds: number[], departments: PublicDepartment[]): number | "all" {
  if (selectedIds.length === 0) return "all";
  // First selected department that still exists in the list
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

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={t("pages.calendar.filter.label")}
      onKeyDown={handleKeyDown}
      className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin"
    >
      {/* "All" chip */}
      <button
        type="button"
        role="checkbox"
        aria-checked={isAllActive}
        onClick={handleAllClick}
        tabIndex={rovingTarget === "all" ? 0 : -1}
        className={`inline-flex shrink-0 items-center rounded-md px-3 py-1.5 min-h-[2.75rem] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
          isAllActive
            ? "bg-indigo-600 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        {t("pages.calendar.filter.all")}
      </button>

      {/* Department chips */}
      {departments.map((dept) => {
        const isActive = selectedIds.includes(dept.id);
        return (
          <button
            key={dept.id}
            type="button"
            role="checkbox"
            aria-checked={isActive}
            onClick={() => handleToggle(dept.id)}
            tabIndex={rovingTarget === dept.id ? 0 : -1}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 min-h-[2.75rem] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              isActive
                ? "text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            style={isActive ? { backgroundColor: dept.color } : undefined}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${isActive ? "bg-white/40" : ""}`}
              style={!isActive ? { backgroundColor: dept.color } : undefined}
            />
            {dept.abbreviation}
          </button>
        );
      })}
    </div>
  );
}
