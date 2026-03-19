import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { parseISO, isToday, isFuture } from "date-fns";
import { Plus, CalendarDays, Pencil, Trash2, Video, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  departmentService,
  type DepartmentListItem,
  type DepartmentWithStaffingListItem,
  type DepartmentResponse,
} from "@/services/departmentService";
import {
  activityService,
  type ActivityListItem,
  type ActivityResponse,
} from "@/services/activityService";
import type {
  CreateActivityFormData,
  UpdateActivityFormData,
} from "@/schemas/activitySchema";
import TemplateSelector from "@/components/activity/TemplateSelector";
import { ActivityForm } from "@/components/activity/ActivityForm";
import { MeetingForm } from "@/components/activity/MeetingForm";
import { StaffingIndicator } from "@/components/activity/StaffingIndicator";
import { ConflictAlertDialog } from "@/components/activity/ConflictAlertDialog";
import { SubMinistryManager } from "@/components/department/SubMinistryManager";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatActivityDate, formatTime } from "@/lib/dateFormatting";
import type { AxiosError } from "axios";

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const departmentId = id ? Number(id) : undefined;
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // State for modals
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [createStep, setCreateStep] = useState<"template" | "form">("template");
  const [editActivity, setEditActivity] = useState<ActivityResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActivityListItem | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [conflictState, setConflictState] = useState<{
    activityId: number;
    formData: UpdateActivityFormData;
  } | null>(null);

  const { data: department, isPending: isDeptPending, isError: isDeptError, isPlaceholderData } = useQuery({
    queryKey: ["departments", departmentId],
    queryFn: () => departmentService.getById(departmentId!).then((res) => res.data),
    enabled: !!departmentId,
    retry: false,
    placeholderData: () => {
      const cached = queryClient.getQueryData<DepartmentWithStaffingListItem[]>(
        ["departments", "with-staffing"]
      )?.find((d) => d.id === departmentId);
      if (!cached) return undefined;
      return {
        ...cached,
        subMinistries: [],
        createdAt: "",
        updatedAt: "",
      } as DepartmentResponse;
    },
  });

  const { data: allActivities, isPending: isActivitiesPending } = useQuery({
    queryKey: ["activities", { departmentId }],
    queryFn: () => activityService.getByDepartment(departmentId!).then((res) => res.data),
    enabled: !!departmentId,
  });

  // Departments list for ActivityForm department dropdown
  const { data: departments } = useQuery<DepartmentListItem[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await departmentService.getAll();
      return res.data;
    },
    enabled: !!departmentId,
  });

  const upcomingActivities = useMemo(() => {
    if (!allActivities) return [];
    return allActivities
      .filter((a) => {
        const d = parseISO(a.date);
        return isToday(d) || isFuture(d);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allActivities]);

  useEffect(() => {
    if (department) {
      document.title = department.name;
    }
  }, [department]);

  const isAdminWithScope =
    user?.role === "ADMIN" &&
    departmentId !== undefined &&
    (user.departmentIds?.includes(departmentId) ?? false);
  const isOwner = user?.role === "OWNER";
  const canManage = isAdminWithScope || isOwner;

  // Mutations
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["activities", { departmentId }] });
    queryClient.invalidateQueries({ queryKey: ["activities"] });
    queryClient.invalidateQueries({ queryKey: ["activity"] });
    queryClient.invalidateQueries({ queryKey: ["departments", "with-staffing"] });
  }, [queryClient, departmentId]);

  const createMutation = useMutation({
    mutationFn: (data: CreateActivityFormData) =>
      activityService.create({
        ...data,
        startTime: data.startTime + ":00",
        endTime: data.endTime + ":00",
      }),
    onSuccess: (_res, variables) => {
      invalidateAll();
      setShowCreateActivity(false);
      setShowCreateMeeting(false);
      setCreateStep("template");
      setSelectedTemplateId(null);
      toast.success(
        variables.isMeeting
          ? t("pages.authDepartments.toast.meetingCreated")
          : t("pages.authDepartments.toast.created")
      );
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
      invalidateAll();
      setEditActivity(null);
      toast.success(t("pages.authDepartments.toast.updated"));
    },
    onError: (error: AxiosError, variables) => {
      if (error.response?.status === 409) {
        if (variables.force) {
          toast.error(t("pages.adminActivities.conflictError"));
        } else {
          setConflictState({ activityId: variables.id, formData: variables.data });
        }
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (actId: number) => activityService.delete(actId),
    onSuccess: () => {
      invalidateAll();
      setDeleteTarget(null);
      toast.success(t("pages.authDepartments.toast.deleted"));
    },
  });

  const [isEditLoading, setIsEditLoading] = useState(false);

  const handleEdit = useCallback(async (item: ActivityListItem) => {
    setIsEditLoading(true);
    try {
      const res = await activityService.getById(item.id);
      setEditActivity(res.data);
    } catch {
      toast.error(t("pages.authDepartments.toast.loadError"));
    } finally {
      setIsEditLoading(false);
    }
  }, [t]);

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
    } catch {
      setEditActivity(null);
    }
  }, [conflictState]);

  const handleConflictOverwrite = useCallback(() => {
    const { activityId, formData } = conflictState!;
    setConflictState(null);
    updateMutation.mutate({ id: activityId, data: formData, force: true });
  }, [conflictState, updateMutation]);

  // 404 handling
  if (isDeptError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <p className="text-lg font-semibold text-slate-700">{t("pages.authDepartments.departmentNotFound")}</p>
        <Link
          to="/my-departments"
          className="mt-3 inline-block text-indigo-600 hover:underline"
        >
          {t("pages.authDepartments.backToList")}
        </Link>
      </div>
    );
  }

  const FormWrapper = isMobile ? Sheet : Dialog;
  const FormContent = isMobile ? SheetContent : DialogContent;
  const FormHeader = isMobile ? SheetHeader : DialogHeader;
  const FormTitle = isMobile ? SheetTitle : DialogTitle;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-slate-500">
        <Link to="/my-departments" className="hover:text-indigo-600 hover:underline">
          {t("pages.authDepartments.backToList")}
        </Link>
        {department && (
          <>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="font-medium text-slate-700" aria-current="page">{department.abbreviation}</span>
          </>
        )}
      </nav>

      {/* Responsive layout: stacked on mobile, 2-col on sm+ */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_320px]">
        {/* Main content: Activity pipeline */}
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-slate-700">
              {t("pages.authDepartments.upcomingActivities")}
            </h2>
            {canManage && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="min-h-[44px] flex-1 sm:flex-none"
                  onClick={() => setShowCreateActivity(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t("pages.authDepartments.newActivity")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] flex-1 sm:flex-none"
                  onClick={() => setShowCreateMeeting(true)}
                >
                  <CalendarDays className="mr-1 h-4 w-4" />
                  {t("pages.authDepartments.newMeeting")}
                </Button>
              </div>
            )}
          </div>

          {isActivitiesPending ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40 flex-1" />
                  <Skeleton className="h-3 w-3 rounded-full" />
                </div>
              ))}
            </div>
          ) : upcomingActivities.length === 0 ? (
            <div className="mt-4">
              {canManage ? (
                <div className="text-center py-8">
                  <p className="text-sm italic text-slate-400 mb-4">
                    {t("pages.authDepartments.noActivitiesAdminCta")}
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      className="min-h-[44px]"
                      onClick={() => setShowCreateActivity(true)}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      {t("pages.authDepartments.newActivity")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-[44px]"
                      onClick={() => setShowCreateMeeting(true)}
                    >
                      <CalendarDays className="mr-1 h-4 w-4" />
                      {t("pages.authDepartments.newMeeting")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm italic text-slate-400">
                  {t("pages.authDepartments.noActivitiesViewer")}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {upcomingActivities.map((activity) => (
                <Link
                  key={activity.id}
                  to={`/activities/${activity.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="min-w-[120px] text-sm text-slate-500">
                    {formatActivityDate(activity.date, t, i18n.language)}
                    {" "}
                    {formatTime(activity.startTime)}
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                    {activity.title}
                  </span>

                  {/* Branch on isMeeting for indicator vs meeting info */}
                  {activity.isMeeting ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                      {activity.meetingType === "zoom" ? (
                        <Video className="h-3.5 w-3.5" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                      <span className="truncate max-w-[80px]">
                        {activity.meetingType === "zoom"
                          ? "Zoom"
                          : activity.locationName ?? ""}
                      </span>
                    </span>
                  ) : (
                    <>
                      <StaffingIndicator
                        staffingStatus={activity.staffingStatus}
                        assigned={activity.assignedCount}
                        total={activity.totalHeadcount}
                        size="sm"
                        showLabel={false}
                      />
                      {activity.specialType && (
                        <Badge variant="outline" className="text-xs">
                          {activity.specialType}
                        </Badge>
                      )}
                    </>
                  )}

                  {/* Admin controls */}
                  {canManage && (
                    <div
                      className="flex shrink-0 gap-1"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={isEditLoading}
                        onClick={() => handleEdit(activity)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => setDeleteTarget(activity)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Department info + sub-ministries */}
        <div className="order-first sm:order-last">
          {isDeptPending ? (
            <div className="space-y-4">
              <div className="h-2 w-full rounded" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
            </div>
          ) : department ? (
            <div>
              {/* Color bar accent */}
              <div
                className="h-2 w-full rounded"
                style={{ backgroundColor: department.color || "#E2E8F0" }}
              />
              <div className="mt-3 flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{department.name}</h1>
                <Badge variant="secondary">{department.abbreviation}</Badge>
              </div>
              {department.description && (
                <p className="mt-2 text-sm text-slate-600">{department.description}</p>
              )}

              {/* Sub-ministries section */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  {t("pages.authDepartments.subMinistries")}
                </h3>
                {isPlaceholderData ? (
                  <div className="mt-2 space-y-2">
                    <Skeleton className="h-7 w-24 rounded-full" />
                    <Skeleton className="h-7 w-28 rounded-full" />
                  </div>
                ) : canManage && departmentId !== undefined ? (
                  <div className="mt-2">
                    <SubMinistryManager
                      departmentId={departmentId}
                      subMinistries={department.subMinistries}
                    />
                  </div>
                ) : department.subMinistries.length === 0 ? (
                  <p className="mt-2 text-sm italic text-slate-400">
                    {t("pages.authDepartments.noSubMinistries")}
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {department.subMinistries.map((sm) => (
                      <div key={sm.id} className="flex items-center gap-2">
                        <span className="flex-1 text-sm text-slate-700">{sm.name}</span>
                        {sm.leadUserId && sm.leadFirstName && sm.leadLastName ? (
                          <div className="flex items-center gap-1.5">
                            <InitialsAvatar
                              firstName={sm.leadFirstName}
                              lastName={sm.leadLastName}
                              avatarUrl={sm.leadAvatarUrl ?? undefined}
                              size="xs"
                            />
                            <span className="text-xs text-muted-foreground">
                              {sm.leadFirstName} {sm.leadLastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Create Activity Modal */}
      <FormWrapper
        open={showCreateActivity}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setShowCreateActivity(false);
            setCreateStep("template");
            setSelectedTemplateId(null);
          }
        }}
      >
        <FormContent className={isMobile ? "overflow-y-auto" : "max-h-[90vh] overflow-y-auto sm:max-w-lg"}>
          <FormHeader>
            <FormTitle>{t("pages.authDepartments.newActivity")}</FormTitle>
          </FormHeader>
          <div className="mt-4">
            {createStep === "template" ? (
              <TemplateSelector
                onSelect={(template) => {
                  setSelectedTemplateId(template?.id ?? null);
                  setCreateStep("form");
                }}
                selectedId={selectedTemplateId}
                isOwner={isOwner}
              />
            ) : departmentId !== undefined ? (
              <ActivityForm
                onSubmit={(data) => createMutation.mutate(data)}
                isPending={createMutation.isPending}
                departments={departments ?? []}
                defaultValues={{
                  departmentId,
                  ...(selectedTemplateId ? { templateId: selectedTemplateId } : {}),
                }}
                lockDepartment
              />
            ) : null}
          </div>
        </FormContent>
      </FormWrapper>

      {/* Create Meeting Modal */}
      <FormWrapper
        open={showCreateMeeting}
        onOpenChange={(open: boolean) => {
          if (!open) setShowCreateMeeting(false);
        }}
      >
        <FormContent className={isMobile ? "overflow-y-auto" : "max-h-[90vh] overflow-y-auto sm:max-w-lg"}>
          <FormHeader>
            <FormTitle>{t("pages.authDepartments.newMeeting")}</FormTitle>
          </FormHeader>
          <div className="mt-4">
            {departmentId !== undefined && (
              <MeetingForm
                departmentId={departmentId}
                onSubmit={(data) => createMutation.mutate(data)}
                isPending={createMutation.isPending}
              />
            )}
          </div>
        </FormContent>
      </FormWrapper>

      {/* Edit Activity/Meeting Modal */}
      <FormWrapper
        open={!!editActivity}
        onOpenChange={(open: boolean) => {
          if (!open) setEditActivity(null);
        }}
      >
        <FormContent className={isMobile ? "overflow-y-auto" : "max-h-[90vh] overflow-y-auto sm:max-w-lg"}>
          <FormHeader>
            <FormTitle>
              {editActivity?.isMeeting
                ? t("pages.authDepartments.editMeeting")
                : t("pages.authDepartments.editActivity")}
            </FormTitle>
          </FormHeader>
          <div className="mt-4">
            {editActivity && departmentId !== undefined && (
              editActivity.isMeeting ? (
                <MeetingForm
                  departmentId={departmentId}
                  onSubmit={handleEditSubmit}
                  isPending={updateMutation.isPending}
                  defaultValues={{
                    title: editActivity.title,
                    description: editActivity.description ?? "",
                    date: editActivity.date,
                    startTime: editActivity.startTime.slice(0, 5),
                    endTime: editActivity.endTime.slice(0, 5),
                    isMeeting: true,
                    meetingType: editActivity.meetingType as "zoom" | "physical" | undefined,
                    zoomLink: editActivity.zoomLink ?? "",
                    locationName: editActivity.locationName ?? "",
                    locationAddress: editActivity.locationAddress ?? "",
                    visibility: "authenticated",
                    departmentId,
                  }}
                />
              ) : (
                <ActivityForm
                  onSubmit={handleEditSubmit}
                  isPending={updateMutation.isPending}
                  departments={departments ?? []}
                  lockDepartment
                  defaultValues={{
                    title: editActivity.title,
                    description: editActivity.description ?? "",
                    date: editActivity.date,
                    startTime: editActivity.startTime.slice(0, 5),
                    endTime: editActivity.endTime.slice(0, 5),
                    departmentId: editActivity.departmentId ?? departmentId,
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
                    new Map(
                      editActivity.roles.flatMap((r) =>
                        r.assignments.map((a) => [a.userId, r.id])
                      )
                    )
                  }
                />
              )
            )}
          </div>
        </FormContent>
      </FormWrapper>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pages.authDepartments.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pages.authDepartments.deleteConfirmMessage", { title: deleteTarget?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conflict Dialog */}
      {conflictState && (
        <ConflictAlertDialog
          open={!!conflictState}
          onReload={handleConflictReload}
          onOverwrite={handleConflictOverwrite}
          onOpenChange={(open) => {
            if (!open) {
              setConflictState(null);
              setEditActivity(null);
            }
          }}
        />
      )}
    </div>
  );
}
