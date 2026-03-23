import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CalendarDays, Pencil, Trash2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  activityService,
  type ActivityListItem,
  type ActivityResponse,
} from "@/services/activityService";
import type { ActivityTemplateListItem } from "@/services/activityTemplateService";
import TemplateSelector from "@/components/activity/TemplateSelector";
import { ActivityForm } from "@/components/activity/ActivityForm";
import { StaffingIndicator } from "@/components/activity/StaffingIndicator";
import { ActivityRosterView } from "@/components/activity/ActivityRosterView";
import { ConflictAlertDialog } from "@/components/activity/ConflictAlertDialog";
import { departmentService, type DepartmentListItem } from "@/services/departmentService";
import {
  type CreateActivityFormData,
  type UpdateActivityFormData,
} from "@/schemas/activitySchema";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ModifiedBadge } from "@/components/ui/ModifiedBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AssignableOfficer } from "@/services/userService";
import type { AxiosError } from "axios";

/** Read-only roster panel content — extracted to avoid triple .find() on activities array */
function RosterPanelContent({
  viewActivity,
  activities,
  formatTime,
}: {
  viewActivity: ActivityResponse;
  activities: ActivityListItem[] | undefined;
  formatTime: (time: string) => string;
}) {
  // Single lookup for list-level staffing data (server-computed StaffingStatus)
  const listItem = useMemo(
    () => activities?.find((a) => a.id === viewActivity.id),
    [activities, viewActivity.id],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{viewActivity.date}</span>
        <span>
          {formatTime(viewActivity.startTime)}–
          {formatTime(viewActivity.endTime)}
        </span>
        <Badge
          variant="secondary"
          className="text-xs"
          style={{
            backgroundColor: listItem?.departmentColor
              ? `${listItem.departmentColor}20`
              : undefined,
            color: listItem?.departmentColor || undefined,
          }}
        >
          {viewActivity.departmentName}
        </Badge>
      </div>
      <StaffingIndicator
        staffingStatus={listItem?.staffingStatus ?? "NoRoles"}
        assigned={listItem?.assignedCount ?? 0}
        total={listItem?.totalHeadcount ?? 0}
      />
      <Separator />
      <ActivityRosterView roles={viewActivity.roles} />
    </div>
  );
}

export default function AdminActivitiesPage() {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const isOwner = user?.role?.toUpperCase() === "OWNER";
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const canAccess = isOwner || isAdmin;

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createStep, setCreateStep] = useState<"template" | "form">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<ActivityTemplateListItem | null>(null);
  const [editActivity, setEditActivity] = useState<ActivityResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActivityListItem | null>(null);
  const [viewActivityId, setViewActivityId] = useState<number | null>(null);
  const [conflictState, setConflictState] = useState<{ activityId: number; formData: UpdateActivityFormData } | null>(null);

  // For admin, use first departmentId; owner sees all
  const adminDeptId = user?.departmentIds?.[0];

  const { data: activities, isLoading } = useQuery<ActivityListItem[]>({
    queryKey: ["activities", isOwner ? "all" : adminDeptId],
    queryFn: async () => {
      const res = isOwner
        ? await activityService.getAll()
        : await activityService.getByDepartment(adminDeptId!);
      return res.data;
    },
    enabled: canAccess && (isOwner || !!adminDeptId),
  });

  const { data: departments } = useQuery<DepartmentListItem[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await departmentService.getAll();
      return res.data;
    },
    enabled: canAccess,
  });

  const { data: viewActivity, isLoading: isViewLoading } = useQuery({
    queryKey: ["activity", viewActivityId],
    queryFn: async () => {
      const res = await activityService.getById(viewActivityId!);
      return res.data;
    },
    enabled: !!viewActivityId,
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
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      setShowCreateForm(false);
      setCreateStep("template");
      setSelectedTemplate(null);
      toast.success(t("pages.adminActivities.toast.created"));
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === 400 && selectedTemplate) {
        toast.error(t("pages.adminActivities.templateSelector.templateError"));
      } else if (error.response?.status === 422) {
        toast.error(t("pages.adminActivities.assignmentError"));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data, force }: { id: number; data: UpdateActivityFormData; force?: boolean }) =>
      activityService.update(id, {
        ...data,
        startTime: data.startTime.length === 5 ? data.startTime + ":00" : data.startTime,
        endTime: data.endTime.length === 5 ? data.endTime + ":00" : data.endTime,
      }, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      setEditActivity(null);
      toast.success(t("pages.adminActivities.toast.updated"));
    },
    onError: (error: AxiosError, variables) => {
      if (error.response?.status === 409) {
        // If force-save also got 409 (ultra-rare race), fall back to toast to prevent infinite dialog loop
        if (variables.force) {
          toast.error(t("pages.adminActivities.conflictError"));
        } else {
          setConflictState({ activityId: variables.id, formData: variables.data });
        }
      } else if (error.response?.status === 422) {
        toast.error(t("pages.adminActivities.assignmentError"));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => activityService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      setDeleteTarget(null);
      toast.success(t("pages.adminActivities.toast.deleted"));
    },
  });

  const handleEdit = useCallback(async (item: ActivityListItem) => {
    const res = await activityService.getById(item.id);
    setEditActivity(res.data);
  }, []);

  const handleEditSubmit = useCallback(
    (data: CreateActivityFormData) => {
      if (!editActivity) return;
      updateMutation.mutate({
        id: editActivity.id,
        data: { ...data, concurrencyToken: editActivity.concurrencyToken },
      });
    },
    [editActivity, updateMutation]
  );

  const handleConflictReload = useCallback(async () => {
    const activityId = conflictState!.activityId;
    setConflictState(null);
    try {
      const res = await activityService.getById(activityId);
      setEditActivity(res.data);
      toast.success(t("pages.adminActivities.conflict.reloaded"));
    } catch {
      toast.error(t("pages.adminActivities.conflict.reloadError"));
      setEditActivity(null);
    }
  }, [conflictState, t]);

  const handleConflictOverwrite = useCallback(() => {
    const { activityId, formData } = conflictState!;
    setConflictState(null);
    updateMutation.mutate({ id: activityId, data: formData, force: true });
  }, [conflictState, updateMutation]);

  const formatTime = (time: string) => time.slice(0, 5);

  if (isAuthLoading) {
    return (
      <div>
        <h1 className="text-2xl font-black">{t("pages.adminActivities.title")}</h1>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div>
        <h1 className="text-2xl font-black">{t("pages.adminActivities.title")}</h1>
        <p className="mt-4 text-muted-foreground">
          {t("pages.adminActivityTemplates.noAccess")}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-black">{t("pages.adminActivities.title")}</h1>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  const isEmpty = !activities || activities.length === 0;

  const FormWrapper = isMobile ? Sheet : Dialog;
  const FormContent = isMobile ? SheetContent : DialogContent;
  const FormHeader = isMobile ? SheetHeader : DialogHeader;
  const FormTitle = isMobile ? SheetTitle : DialogTitle;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">{t("pages.adminActivities.title")}</h1>
        {!isEmpty && (
          <Button onClick={() => setShowCreateForm(true)} className="min-h-[44px]">
            <Plus className="mr-1 h-4 w-4" />
            {t("pages.adminActivities.createButton")}
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <CalendarDays className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            {t("pages.adminActivities.emptyState")}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {t("pages.adminActivities.emptyStateHelper")}
          </p>
          <Button className="mt-6 min-h-[44px]" onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t("pages.adminActivities.createButton")}
          </Button>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pages.adminActivities.form.title")}</TableHead>
                <TableHead>{t("pages.adminActivities.form.date")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("pages.adminActivities.form.startTime")}
                </TableHead>
                <TableHead>{t("pages.adminActivities.form.department")}</TableHead>
                <TableHead>{t("pages.adminActivities.staffing.column")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("pages.adminActivities.form.visibility")}
                </TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow
                  key={activity.id}
                  className="cursor-pointer"
                  onClick={() => setViewActivityId(activity.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{activity.title}</span>
                      <ModifiedBadge activityId={activity.id} />
                      {activity.specialType && (
                        <Badge variant="secondary" className="shrink-0 max-w-[10rem] truncate text-xs" data-testid="special-type-badge">
                          {t(`pages.adminActivities.specialType.${activity.specialType}`)}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{activity.date}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatTime(activity.startTime)}–{formatTime(activity.endTime)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: activity.departmentColor
                          ? `${activity.departmentColor}20`
                          : undefined,
                        color: activity.departmentColor || undefined,
                      }}
                      aria-label={activity.departmentName}
                    >
                      {activity.departmentName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StaffingIndicator
                      staffingStatus={activity.staffingStatus}
                      assigned={activity.assignedCount}
                      total={activity.totalHeadcount}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={activity.visibility === "public" ? "default" : "outline"}>
                      {t(`pages.adminActivities.visibility.${activity.visibility}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px]"
                        onClick={(e) => { e.stopPropagation(); handleEdit(activity); }}
                        aria-label={t("pages.adminActivities.form.editTitle")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(activity); }}
                        aria-label={t("pages.adminActivities.deleteConfirmTitle")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Form — Two-step: template selection then form */}
      <FormWrapper
        open={showCreateForm}
        onOpenChange={(open) => {
          setShowCreateForm(open);
          if (!open) {
            setCreateStep("template");
            setSelectedTemplate(null);
          }
        }}
      >
        <FormContent side={isMobile ? "bottom" : undefined} className={isMobile ? "h-[90vh]" : ""}>
          <FormHeader>
            <FormTitle>
              {createStep === "template"
                ? t("pages.adminActivities.templateSelector.title")
                : t("pages.adminActivities.form.createTitle")}
            </FormTitle>
          </FormHeader>
          <div className={isMobile ? "overflow-y-auto flex-1 px-1" : ""}>
            {createStep === "template" ? (
              <TemplateSelector
                onSelect={(template) => {
                  setSelectedTemplate(template);
                  setCreateStep("form");
                }}
                selectedId={selectedTemplate?.id ?? null}
                isOwner={isOwner}
              />
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-3 -ml-2"
                  onClick={() => {
                    setCreateStep("template");
                  }}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t("pages.adminActivities.templateSelector.backToTemplates")}
                </Button>
                <ActivityForm
                  onSubmit={(data) => createMutation.mutate(data)}
                  isPending={createMutation.isPending}
                  departments={availableDepartments}
                  defaultValues={{
                    roles: selectedTemplate?.roles.map((r) => ({
                      roleName: r.roleName,
                      headcount: r.defaultHeadcount,
                    })) ?? [],
                  }}
                />
              </>
            )}
          </div>
        </FormContent>
      </FormWrapper>

      {/* Edit Form */}
      {editActivity && (() => {
        // Extract guest officers from the fetched activity for RoleRosterEditor
        const guestAssignments = editActivity.roles
          .flatMap((role) => role.assignments)
          .filter((a) => a.isGuest);
        const uniqueGuestOfficers: AssignableOfficer[] = guestAssignments
          .filter((g, i, arr) => arr.findIndex((o) => o.userId === g.userId) === i)
          .map((a) => ({
            userId: a.userId,
            firstName: a.firstName,
            lastName: a.lastName,
            avatarUrl: a.avatarUrl ?? null,
            departments: [],
            isGuest: true,
          }));
        return (
          <FormWrapper open={!!editActivity} onOpenChange={(open) => !open && setEditActivity(null)}>
            <FormContent side={isMobile ? "bottom" : undefined} className={isMobile ? "h-[90vh]" : ""}>
              <FormHeader>
                <FormTitle>{t("pages.adminActivities.form.editTitle")}</FormTitle>
              </FormHeader>
              <div className={isMobile ? "overflow-y-auto flex-1 px-1" : ""}>
                <ActivityForm
                  key={`${editActivity.id}-${editActivity.concurrencyToken}`}
                  onSubmit={handleEditSubmit}
                  isPending={updateMutation.isPending}
                  departments={availableDepartments}
                  defaultValues={{
                    title: editActivity.title,
                    description: editActivity.description ?? "",
                    date: editActivity.date,
                    startTime: formatTime(editActivity.startTime),
                    endTime: formatTime(editActivity.endTime),
                    departmentId: editActivity.departmentId ?? 0,
                    visibility: editActivity.visibility as "public" | "authenticated",
                    specialType: editActivity.specialType as CreateActivityFormData["specialType"],
                    roles: editActivity.roles.map((r) => ({
                      id: r.id,
                      roleName: r.roleName,
                      headcount: r.headcount,
                      assignments: r.assignments.map((a) => ({ userId: a.userId })),
                    })),
                  }}
                  existingAssignments={
                    new Map(editActivity.roles.map((r) => [r.id, r.assignments.length]))
                  }
                  initialGuestOfficers={uniqueGuestOfficers.length > 0 ? uniqueGuestOfficers : undefined}
                />
              </div>
            </FormContent>
          </FormWrapper>
        );
      })()}

      {/* Roster View Panel */}
      <FormWrapper
        open={!!viewActivityId}
        onOpenChange={(open) => !open && setViewActivityId(null)}
      >
        <FormContent
          side={isMobile ? "bottom" : undefined}
          className={isMobile ? "h-[85vh]" : ""}
        >
          <FormHeader>
            <FormTitle>
              {viewActivity
                ? viewActivity.title
                : t("pages.adminActivities.roster.title")}
            </FormTitle>
          </FormHeader>
          <div className={isMobile ? "overflow-y-auto flex-1 px-1" : ""}>
            {isViewLoading ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : viewActivity ? (
              <RosterPanelContent
                viewActivity={viewActivity}
                activities={activities}
                formatTime={formatTime}
              />
            ) : null}
          </div>
        </FormContent>
      </FormWrapper>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pages.adminActivities.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pages.adminActivities.deleteConfirmMessage")}
              <br />
              <span className="mt-1 block text-sm font-medium text-destructive">
                {t("pages.adminActivities.deleteConfirmWarning")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">
              {t("pages.adminActivities.form.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="min-h-[44px]"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t("pages.adminActivities.deleteConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conflict Dialog */}
      <ConflictAlertDialog
        open={!!conflictState}
        onReload={handleConflictReload}
        onOverwrite={handleConflictOverwrite}
        onOpenChange={(open) => { if (!open) setConflictState(null); }}
      />
    </div>
  );
}
