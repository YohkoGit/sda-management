import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { useIsMobile } from "@/hooks/use-mobile";
import { activityService } from "@/services/activityService";
import { departmentService, type DepartmentListItem } from "@/services/departmentService";
import type { ActivityTemplateListItem } from "@/services/activityTemplateService";
import type { CreateActivityFormData } from "@/schemas/activitySchema";
import type { PublicActivityListItem } from "@/types/public";
import type { AuthUser } from "@/contexts/AuthContext";
import TemplateSelector from "@/components/activity/TemplateSelector";
import { ActivityForm } from "@/components/activity/ActivityForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModifiedBadge } from "@/components/ui/ModifiedBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

type DayDetailDialogUser = Pick<AuthUser, "role" | "departmentIds">;

interface DayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ISO date string "YYYY-MM-DD" for the selected day */
  date: string;
  /** All loaded activities — filtered client-side by date. No new API call. */
  activities: PublicActivityListItem[];
  /** Current user from useAuth — null for anonymous */
  user: DayDetailDialogUser | null;
  /** Callback fired after successful activity creation. Parent should invalidate queries. */
  onCreated: () => void;
  /** Callback to switch calendar to day view for the selected date. Used by "View full day" link. */
  onNavigateToDay: (date: string) => void;
}

type DialogStep = "detail" | "template" | "form";

export default function DayDetailDialog({
  open,
  onOpenChange,
  date,
  activities,
  user,
  onCreated,
  onNavigateToDay,
}: DayDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<DialogStep>("detail");
  const [selectedTemplate, setSelectedTemplate] = useState<ActivityTemplateListItem | null>(null);

  // Reset state when dialog closes or date changes
  useEffect(() => {
    setStep("detail");
    setSelectedTemplate(null);
  }, [date, open]);

  const isOwner = user?.role?.toUpperCase() === "OWNER";
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const canCreate = isOwner || isAdmin;

  const isPastDate = useMemo(() => {
    if (!date) return false;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return date < todayStr;
  }, [date]);

  // Filter activities for the selected date — client-side, zero API calls
  const dayActivities = useMemo(
    () => activities.filter((a) => a.date === date),
    [activities, date],
  );

  // Format date heading
  const formattedDate = useMemo(() => {
    if (!date) return "";
    const [year, month, day] = date.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat(i18n.language === "fr" ? "fr-CA" : "en-CA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  }, [date, i18n.language]);

  // Fetch departments for the form (only when dialog is open and user can create)
  const { data: departments, isError: deptError, refetch: refetchDepts } = useQuery<DepartmentListItem[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await departmentService.getAll();
      return res.data;
    },
    enabled: open && canCreate,
  });

  // Filter departments based on role
  const availableDepartments = isOwner
    ? (departments ?? [])
    : (departments ?? []).filter((d) => user?.departmentIds?.includes(d.id));

  const createMutation = useMutation({
    mutationFn: (data: CreateActivityFormData) =>
      activityService.create({
        ...data,
        startTime: data.startTime + ":00",
        endTime: data.endTime + ":00",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "calendar"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      onCreated();
      onOpenChange(false);
      toast.success(t("pages.adminActivities.toast.created"));
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === 400 && selectedTemplate) {
        toast.error(t("pages.adminActivities.templateSelector.templateError"));
      } else if (error.response?.status === 422) {
        toast.error(t("pages.adminActivities.assignmentError"));
      } else {
        toast.error(t("auth.error.generic"));
      }
    },
  });

  const handleTemplateSelect = (template: ActivityTemplateListItem | null) => {
    setSelectedTemplate(template);
    setStep("form");
  };

  const handleViewFullDay = () => {
    onOpenChange(false);
    onNavigateToDay(date);
  };

  const formatTime = (time: string) => time.slice(0, 5);

  // --- Step content ---
  const renderDetail = () => (
    <div className="space-y-3">
      {canCreate && (
        <Button
          onClick={() => setStep("template")}
          disabled={isPastDate}
          className="w-full min-h-[44px]"
          aria-label={t("pages.calendar.dayDetail.create")}
          title={isPastDate ? t("pages.calendar.dayDetail.pastDate") : undefined}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {t("pages.calendar.dayDetail.create")}
        </Button>
      )}

      {dayActivities.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("pages.calendar.dayDetail.empty")}
        </p>
      ) : (
        <div role="list" className="space-y-2">
          {dayActivities.map((activity) => (
            <div
              key={activity.id}
              role="listitem"
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              {activity.departmentColor && (
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: activity.departmentColor }}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium">{activity.title}</p>
                  <ModifiedBadge activityId={activity.id} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatTime(activity.startTime)}–{formatTime(activity.endTime)}
                  {activity.departmentAbbreviation && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {activity.departmentAbbreviation}
                    </Badge>
                  )}
                  {activity.specialType && (
                    <Badge variant="outline" className="ml-1 text-xs">
                      {activity.specialType}
                    </Badge>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleViewFullDay}
        className="mt-2 block w-full text-center text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {t("pages.calendar.dayDetail.viewFullDay")}
      </button>
    </div>
  );

  const renderTemplate = () => (
    <div aria-live="polite">
      <Button
        variant="ghost"
        size="sm"
        className="mb-3 -ml-2"
        onClick={() => setStep("detail")}
        aria-label={t("pages.calendar.dayDetail.backToDay")}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        {t("pages.calendar.dayDetail.backToDay")}
      </Button>
      <TemplateSelector
        onSelect={handleTemplateSelect}
        selectedId={selectedTemplate?.id ?? null}
        isOwner={isOwner}
      />
    </div>
  );

  const renderForm = () => (
    <div aria-live="polite">
      <Button
        variant="ghost"
        size="sm"
        className="mb-3 -ml-2"
        onClick={() => setStep("template")}
        aria-label={t("pages.adminActivities.templateSelector.backToTemplates")}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        {t("pages.adminActivities.templateSelector.backToTemplates")}
      </Button>
      {deptError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-600">{t("pages.calendar.dayDetail.departmentError")}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchDepts()}>
            {t("pages.calendar.retry")}
          </Button>
        </div>
      ) : (
        <ActivityForm
          onSubmit={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
          departments={availableDepartments}
          defaultValues={{
            date: date,
            departmentId: availableDepartments.length === 1 ? availableDepartments[0].id : 0,
            roles:
              selectedTemplate?.roles.map((r) => ({
                roleName: r.roleName,
                headcount: r.defaultHeadcount,
              })) ?? [],
          }}
        />
      )}
    </div>
  );

  const stepContent = step === "detail" ? renderDetail() : step === "template" ? renderTemplate() : renderForm();

  const title = step === "detail"
    ? formattedDate
    : step === "template"
      ? t("pages.adminActivities.templateSelector.title")
      : t("pages.adminActivities.form.createTitle");

  // --- Responsive wrapper ---
  const FormWrapper = isMobile ? Drawer : Dialog;
  const FormContent = isMobile ? DrawerContent : DialogContent;
  const FormHeader = isMobile ? DrawerHeader : DialogHeader;
  const FormTitle = isMobile ? DrawerTitle : DialogTitle;
  const FormDescription = isMobile ? DrawerDescription : DialogDescription;

  return (
    <FormWrapper open={open} onOpenChange={onOpenChange}>
      <FormContent
        className={isMobile ? "max-h-[85vh]" : "max-w-lg max-h-[80vh] overflow-y-auto"}
        aria-label={t("pages.calendar.dayDetail.title")}
      >
        <FormHeader>
          <FormTitle>{title}</FormTitle>
          <FormDescription className="sr-only">
            {t("pages.calendar.dayDetail.title")}
          </FormDescription>
        </FormHeader>
        <div className={isMobile ? "overflow-y-auto flex-1 px-4 pb-4" : "px-6 pb-6"}>
          {stepContent}
        </div>
      </FormContent>
    </FormWrapper>
  );
}
