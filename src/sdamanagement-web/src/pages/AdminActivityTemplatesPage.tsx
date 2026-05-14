import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  activityTemplateService,
  type ActivityTemplateListItem,
} from "@/services/activityTemplateService";
import {
  ActivityTemplateCard,
  ActivityTemplateFormDialog,
} from "@/components/activity-template";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminActivityTemplatesPage() {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isOwner = user?.role?.toUpperCase() === "OWNER";
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: templates, isLoading } = useQuery<ActivityTemplateListItem[]>({
    queryKey: ["activity-templates"],
    queryFn: async () => {
      const res = await activityTemplateService.getAll();
      return res.data;
    },
    enabled: isOwner,
  });

  if (isAuthLoading) {
    return (
      <div>
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">
          {t("pages.adminActivityTemplates.title")}
        </h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div>
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">
          {t("pages.adminActivityTemplates.title")}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {t("pages.adminActivityTemplates.noAccess")}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">
          {t("pages.adminActivityTemplates.title")}
        </h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const isEmpty = !templates || templates.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">
          {t("pages.adminActivityTemplates.title")}
        </h1>
        {!isEmpty && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t("pages.adminActivityTemplates.createButton")}
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            {t("pages.adminActivityTemplates.emptyState")}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {t("pages.adminActivityTemplates.emptyStateHelper")}
          </p>
          <Button className="mt-6" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t("pages.adminActivityTemplates.createButton")}
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tmpl) => (
            <ActivityTemplateCard key={tmpl.id} template={tmpl} />
          ))}
        </div>
      )}

      <ActivityTemplateFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
