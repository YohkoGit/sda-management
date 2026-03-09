import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  activityTemplateService,
  type ActivityTemplateListItem,
} from "@/services/activityTemplateService";

interface TemplateSelectorProps {
  onSelect: (template: ActivityTemplateListItem | null) => void;
  selectedId: number | null;
  isOwner: boolean;
}

export default function TemplateSelector({
  onSelect,
  selectedId,
  isOwner,
}: TemplateSelectorProps) {
  const { t } = useTranslation();

  const {
    data: templates,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["activity-templates"],
    queryFn: () => activityTemplateService.getAll().then((r) => r.data),
  });

  const handleCardKeyDown = (
    e: React.KeyboardEvent,
    template: ActivityTemplateListItem | null
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(template);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t("pages.adminActivities.templateSelector.subtitle")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {t("pages.adminActivities.templateSelector.errorState")}
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          {t("pages.adminActivities.templateSelector.retry")}
        </Button>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {t("pages.adminActivities.templateSelector.emptyState")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isOwner
            ? t("pages.adminActivities.templateSelector.emptyStateOwner")
            : t("pages.adminActivities.templateSelector.emptyStateAdmin")}
        </p>
        {/* Always show the custom card so user can proceed without templates */}
        <div
          role="radiogroup"
          aria-label={t("pages.adminActivities.templateSelector.title")}
          className="mt-6 w-full max-w-xs"
        >
          <div
            role="radio"
            aria-checked={selectedId === null}
            aria-label={t("pages.adminActivities.templateSelector.customCard")}
            tabIndex={0}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border p-4 transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
            onClick={() => onSelect(null)}
            onKeyDown={(e) => handleCardKeyDown(e, null)}
          >
            <Plus className="h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold text-foreground">
              {t("pages.adminActivities.templateSelector.customCard")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("pages.adminActivities.templateSelector.customDescription")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("pages.adminActivities.templateSelector.subtitle")}
      </p>
      <div
        role="radiogroup"
        aria-label={t("pages.adminActivities.templateSelector.title")}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        {templates.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <div
              key={template.id}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${template.name}: ${template.roleSummary}`}
              tabIndex={0}
              className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                isSelected
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                  : "border-border hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
              }`}
              onClick={() => onSelect(template)}
              onKeyDown={(e) => handleCardKeyDown(e, template)}
            >
              <p className="text-base font-semibold text-foreground">
                {template.name}
              </p>
              {template.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {template.roleSummary}
              </p>
            </div>
          );
        })}

        {/* Custom (no template) card */}
        <div
          role="radio"
          aria-checked={selectedId === null}
          aria-label={t("pages.adminActivities.templateSelector.customCard")}
          tabIndex={0}
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border p-4 transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
          onClick={() => onSelect(null)}
          onKeyDown={(e) => handleCardKeyDown(e, null)}
        >
          <Plus className="h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold text-foreground">
            {t("pages.adminActivities.templateSelector.customCard")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            {t("pages.adminActivities.templateSelector.customDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}
