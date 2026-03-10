import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
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
}

export function StaffingIndicator({
  staffingStatus,
  assigned,
  total,
  size = "md",
}: StaffingIndicatorProps) {
  const { t } = useTranslation();

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  const ariaLabel =
    staffingStatus === "NoRoles"
      ? t("pages.adminActivities.staffing.ariaLabelNoRoles")
      : staffingStatus === "CriticalGap"
        ? t("pages.adminActivities.staffing.ariaLabelCritical", {
            assigned,
            total,
          })
        : t("pages.adminActivities.staffing.ariaLabel", { assigned, total });

  const tooltipText =
    staffingStatus === "NoRoles"
      ? t("pages.adminActivities.staffing.noRoles")
      : t("pages.adminActivities.staffing.filled", { assigned, total });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1.5 ${textSize}`}
          aria-label={ariaLabel}
          role="status"
        >
          <StatusIcon status={staffingStatus} className={iconSize} />
          <StatusLabel
            status={staffingStatus}
            assigned={assigned}
            total={total}
            t={t}
          />
          {staffingStatus === "CriticalGap" && (
            <Badge variant="destructive" className="px-1.5 py-0 text-[10px] leading-4">
              {t("pages.adminActivities.staffing.criticalGap")}
            </Badge>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function StatusIcon({
  status,
  className,
}: {
  status: string;
  className: string;
}) {
  switch (status) {
    case "FullyStaffed":
      return (
        <svg
          className={`${className} text-emerald-600`}
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="7" />
        </svg>
      );
    case "PartiallyStaffed":
      return (
        <svg
          className={`${className} text-amber-600`}
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M8 1a7 7 0 110 14A7 7 0 018 1z" fill="currentColor" opacity="0.3" />
          <path d="M8 1a7 7 0 010 14V1z" fill="currentColor" />
        </svg>
      );
    case "CriticalGap":
      return (
        <svg
          className={`${className} text-red-600`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" />
        </svg>
      );
    default:
      return (
        <svg
          className={`${className} text-muted-foreground`}
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect x="3" y="7" width="10" height="2" rx="1" />
        </svg>
      );
  }
}

function StatusLabel({
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
      return (
        <span className="text-emerald-600 font-medium">
          {t("pages.adminActivities.staffing.fullyStaffed")}
        </span>
      );
    case "PartiallyStaffed":
      return (
        <span className="text-amber-600 font-medium">
          {t("pages.adminActivities.staffing.partiallyStaffed", {
            assigned,
            total,
          })}
        </span>
      );
    case "CriticalGap":
      return (
        <span className="text-red-600 font-medium">
          {t("pages.adminActivities.staffing.count", {
            assigned,
            total,
          })}
        </span>
      );
    default:
      return (
        <span className="text-muted-foreground">
          {t("pages.adminActivities.staffing.noRoles")}
        </span>
      );
  }
}
