import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useModifiedBadgeStore } from "@/stores/modifiedBadgeStore";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface ModifiedBadgeProps {
  activityId: number;
}

export function ModifiedBadge({ activityId }: ModifiedBadgeProps) {
  const { t } = useTranslation();
  const isModified = useModifiedBadgeStore((s) => s.isModified(activityId));
  const timestamp = useModifiedBadgeStore(
    (s) => s.modifiedActivities[activityId],
  );

  // Auto-expire: dismiss the badge when the 24h window elapses (AC 3)
  useEffect(() => {
    if (!timestamp) return;
    const remaining =
      TWENTY_FOUR_HOURS_MS - (Date.now() - new Date(timestamp).getTime());
    if (remaining <= 0) return;
    const timer = setTimeout(() => {
      useModifiedBadgeStore.getState().dismiss(activityId);
    }, remaining);
    return () => clearTimeout(timer);
  }, [activityId, timestamp]);

  if (!isModified) return null;

  return (
    <Badge
      className="bg-amber-500 text-white border-transparent text-xs font-medium hover:bg-amber-500"
      aria-live="polite"
    >
      {t("common.modifiedBadge")}
    </Badge>
  );
}
