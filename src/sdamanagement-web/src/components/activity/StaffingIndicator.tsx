import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StaffingIndicatorProps {
  staffingStatus: string;
  assigned: number;
  total: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function StaffingIndicator({
  staffingStatus,
  assigned,
  total,
  size = "md",
  showLabel = true,
}: StaffingIndicatorProps) {
  const { t } = useTranslation();

  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  const textSize = size === "sm" ? "text-[10px]" : "text-[11px]";

  const ariaLabel =
    staffingStatus === "NoRoles"
      ? t("pages.adminActivities.staffing.ariaLabelNoRoles")
      : staffingStatus === "CriticalGap"
        ? t("pages.adminActivities.staffing.ariaLabelCritical", { assigned, total })
        : t("pages.adminActivities.staffing.ariaLabel", { assigned, total });

  const tooltipText = !showLabel
    ? staffingStatus === "FullyStaffed"
      ? t("pages.adminActivities.staffing.fullyStaffed")
      : staffingStatus === "CriticalGap"
        ? t("pages.adminActivities.staffing.criticalGap")
        : staffingStatus === "PartiallyStaffed"
          ? t("pages.adminActivities.staffing.partialLabel")
          : t("pages.adminActivities.staffing.noRoles")
    : staffingStatus === "NoRoles"
      ? t("pages.adminActivities.staffing.noRoles")
      : t("pages.adminActivities.staffing.filled", { assigned, total });

  const dotColor =
    staffingStatus === "FullyStaffed"
      ? "var(--staffed)"
      : staffingStatus === "PartiallyStaffed"
        ? "var(--gaps)"
        : staffingStatus === "CriticalGap"
          ? "var(--rose)"
          : "var(--ink-4)";

  const labelColor =
    staffingStatus === "FullyStaffed"
      ? "text-[var(--staffed)]"
      : staffingStatus === "PartiallyStaffed"
        ? "text-[var(--gaps)]"
        : staffingStatus === "CriticalGap"
          ? "text-[var(--rose)]"
          : "text-[var(--ink-3)]";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-2 font-mono ${textSize} uppercase tracking-[0.14em] ${labelColor}`}
          aria-label={ariaLabel}
          role="status"
        >
          <span
            aria-hidden
            className={`shrink-0 rounded-full ${dotSize}`}
            style={{ backgroundColor: dotColor }}
          />
          {showLabel && (
            <Label
              status={staffingStatus}
              assigned={assigned}
              total={total}
              t={t}
            />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

function Label({
  status,
  assigned,
  total,
  t,
}: {
  status: string;
  assigned: number;
  total: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  switch (status) {
    case "FullyStaffed":
      return <span>{t("pages.adminActivities.staffing.fullyStaffed")}</span>;
    case "PartiallyStaffed":
      return (
        <span>
          {t("pages.adminActivities.staffing.partiallyStaffed", { assigned, total })}
        </span>
      );
    case "CriticalGap":
      return (
        <span>
          {t("pages.adminActivities.staffing.count", { assigned, total })}
          {" · "}
          {t("pages.adminActivities.staffing.criticalGap")}
        </span>
      );
    default:
      return <span>{t("pages.adminActivities.staffing.noRoles")}</span>;
  }
}
