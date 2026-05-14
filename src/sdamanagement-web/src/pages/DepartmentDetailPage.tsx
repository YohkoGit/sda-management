import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { parseISO, isToday, isFuture } from "date-fns";
import { Plus, CalendarDays, Pencil, Trash2, Video, MapPin, ChevronRight } from "lucide-react";
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
import { ModifiedBadge } from "@/components/ui/ModifiedBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow, Numerator, Serial } from "@/components/ui/typography";
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
import { deptSwatchColor } from "@/lib/dept-color";
import type { AxiosError } from "axios";

function FancyTitle({ text }: { text: string }) {
  const words = text.split(" ");
  if (words.length < 2) {
    return (
      <>
        <span>{text}</span>
        <span className="text-[var(--gilt-2)]">.</span>
      </>
    );
  }
  const head = words.slice(0, words.length - 1).join(" ");
  const tail = words[words.length - 1];
  return (
    <>
      <span>{head} </span>
      <span className="italic font-normal">{tail}</span>
      <span className="text-[var(--gilt-2)]">.</span>
    </>
  );
}

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const departmentId = id ? Number(id) : undefined;
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();

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

  if (isDeptError) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <p className="font-display text-2xl text-[var(--ink-2)]">
          {t("pages.authDepartments.departmentNotFound")}
        </p>
        <Link
          to="/my-departments"
          className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--gilt-2)] hover:underline"
        >
          ← {t("pages.authDepartments.backToList")}
        </Link>
      </div>
    );
  }

  const FormWrapper = isMobile ? Sheet : Dialog;
  const FormContent = isMobile ? SheetContent : DialogContent;
  const FormHeader = isMobile ? SheetHeader : DialogHeader;
  const FormTitle = isMobile ? SheetTitle : DialogTitle;

  const swatch = deptSwatchColor({
    abbreviation: department?.abbreviation ?? undefined,
    color: department?.color ?? undefined,
  });

  const totalMembers = department?.subMinistries?.length ?? 0;
  const totalUpcoming = upcomingActivities.length;
  const staffedCount = upcomingActivities.filter((a) => a.staffingStatus === "FullyStaffed").length;
  const gapCount = upcomingActivities.filter(
    (a) => a.staffingStatus === "PartiallyStaffed" || a.staffingStatus === "CriticalGap",
  ).length;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Breadcrumb */}
      <nav className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
        <Link to="/my-departments" className="hover:text-[var(--ink)] hover:underline">
          {t("pages.authDepartments.backToList")}
        </Link>
        {department && (
          <>
            <span className="mx-2 text-[var(--ink-4)]" aria-hidden>/</span>
            <span className="text-[var(--ink)]" aria-current="page">{department.abbreviation}</span>
          </>
        )}
      </nav>

      {/* Header */}
      <header className="mt-8 flex flex-col gap-6 border-b border-[var(--ink)] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {isDeptPending ? (
            <Skeleton className="h-10 w-72 bg-[var(--parchment-2)]" />
          ) : department ? (
            <>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: swatch }}
                />
                <Eyebrow gilt>
                  {t("pages.authDepartments.subtitle", "Ministère")} ·{" "}
                  {String((departmentId ?? 0)).padStart(2, "0")}
                </Eyebrow>
              </div>
              <h1 className="mt-3 font-display text-4xl leading-tight text-[var(--ink)] lg:text-5xl">
                <FancyTitle text={department.name} />
              </h1>
              {department.description && (
                <p className="mt-3 max-w-xl text-base text-[var(--ink-2)]">
                  {department.description}
                </p>
              )}
            </>
          ) : null}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateActivity(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("pages.authDepartments.newActivity")}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateMeeting(true)}>
              <CalendarDays className="mr-1.5 h-4 w-4" />
              {t("pages.authDepartments.newMeeting")}
            </Button>
          </div>
        )}
      </header>

      {/* Stats strip */}
      <section className="mt-8 grid grid-cols-2 gap-4 border-b border-[var(--hairline)] pb-8 sm:grid-cols-4 sm:divide-x sm:divide-[var(--hairline)]">
        <Stat label={t("pages.authDepartments.stats.upcoming", "Activités à venir")} value={totalUpcoming} />
        <Stat
          label={t("pages.authDepartments.stats.staffed", "Pleinement servies")}
          value={staffedCount}
          tone={staffedCount > 0 ? "staffed" : "neutral"}
        />
        <Stat
          label={t("pages.authDepartments.stats.gaps", "Postes à pourvoir")}
          value={gapCount}
          tone={gapCount > 0 ? "gaps" : "neutral"}
        />
        <Stat label={t("pages.authDepartments.stats.subMinistries", "Sous-ministères")} value={totalMembers} />
      </section>

      {/* Two-column body */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
        {/* Activities pipeline */}
        <section>
          <div className="flex items-baseline justify-between gap-4 border-b border-[var(--ink)] pb-4">
            <h2 className="font-display text-2xl leading-tight text-[var(--ink)] sm:text-3xl">
              {t("pages.authDepartments.upcomingActivities")}
            </h2>
            <Eyebrow>{totalUpcoming} {t("pages.authDepartments.entries", "entrées")}</Eyebrow>
          </div>

          {isActivitiesPending ? (
            <div className="space-y-2 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-t border-[var(--hairline)] py-5">
                  <Skeleton className="h-10 w-12 bg-[var(--parchment-2)]" />
                  <Skeleton className="h-5 w-2/3 bg-[var(--parchment-2)]" />
                </div>
              ))}
            </div>
          ) : upcomingActivities.length === 0 ? (
            <div className="border-t border-[var(--hairline)] py-12 text-center" role="status">
              {canManage ? (
                <>
                  <p className="font-display text-xl italic text-[var(--ink-3)]">
                    {t("pages.authDepartments.noActivitiesAdminCta")}
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <Button onClick={() => setShowCreateActivity(true)}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      {t("pages.authDepartments.newActivity")}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateMeeting(true)}>
                      <CalendarDays className="mr-1.5 h-4 w-4" />
                      {t("pages.authDepartments.newMeeting")}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="font-display text-xl italic text-[var(--ink-3)]">
                  {t("pages.authDepartments.noActivitiesViewer")}
                </p>
              )}
            </div>
          ) : (
            <ul>
              {upcomingActivities.map((activity, idx) => {
                const date = parseISO(activity.date);
                const day = date.getDate();
                const weekday = date.toLocaleDateString(i18n.language, { weekday: "short" });
                return (
                  <li
                    key={activity.id}
                    className="grid grid-cols-[32px_minmax(64px,80px)_1fr_auto_auto] items-center gap-4 border-t border-[var(--hairline)] py-5 transition-colors hover:bg-[var(--parchment-2)]"
                  >
                    <Serial n={idx + 1} />
                    <div className="flex flex-col leading-none">
                      <Numerator className="text-3xl text-[var(--ink)]">{day}</Numerator>
                      <Eyebrow className="mt-1 capitalize">{weekday}</Eyebrow>
                    </div>
                    <Link
                      to={`/activities/${activity.id}`}
                      className="min-w-0 no-underline text-inherit"
                    >
                      <h3 className="truncate font-display text-lg text-[var(--ink)]">
                        {activity.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm tabular-nums text-[var(--ink-2)]">
                          {formatTime(activity.startTime, i18n.language)}
                          {activity.endTime && (
                            <>–{formatTime(activity.endTime, i18n.language)}</>
                          )}
                        </span>
                        <ModifiedBadge activityId={activity.id} />
                        {activity.specialType && (
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--gilt-2)]">
                            ✣ {t(`pages.home.specialType.${activity.specialType}`)}
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="shrink-0">
                      {activity.isMeeting ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
                          {activity.meetingType === "zoom" ? (
                            <Video className="h-3.5 w-3.5" />
                          ) : (
                            <MapPin className="h-3.5 w-3.5" />
                          )}
                          {activity.meetingType === "zoom"
                            ? "Zoom"
                            : activity.locationName ?? ""}
                        </span>
                      ) : (
                        <StaffingIndicator
                          staffingStatus={activity.staffingStatus}
                          assigned={activity.assignedCount}
                          total={activity.totalHeadcount}
                          size="sm"
                          showLabel={false}
                        />
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={isEditLoading}
                            onClick={() => handleEdit(activity)}
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-[var(--rose)] hover:text-[var(--rose)]/90"
                            onClick={() => setDeleteTarget(activity)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <ChevronRight className="h-4 w-4 text-[var(--ink-4)]" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Sub-ministries */}
        <aside>
          <div className="flex items-baseline justify-between gap-4 border-b border-[var(--ink)] pb-4">
            <h2 className="font-display text-2xl leading-tight text-[var(--ink)] sm:text-3xl">
              {t("pages.authDepartments.subMinistries")}
            </h2>
            <Eyebrow>{totalMembers}</Eyebrow>
          </div>
          {isDeptPending || !department ? (
            <div className="space-y-2 pt-4">
              <Skeleton className="h-12 bg-[var(--parchment-2)]" />
              <Skeleton className="h-12 bg-[var(--parchment-2)]" />
            </div>
          ) : isPlaceholderData ? (
            <p className="border-t border-[var(--hairline)] py-6 text-sm text-[var(--ink-3)]">
              {t("layout.loading")}…
            </p>
          ) : canManage && departmentId !== undefined ? (
            <div className="mt-4">
              <SubMinistryManager
                departmentId={departmentId}
                subMinistries={department.subMinistries}
              />
            </div>
          ) : department.subMinistries.length === 0 ? (
            <p className="border-t border-[var(--hairline)] py-8 text-center font-display text-base italic text-[var(--ink-3)]">
              {t("pages.authDepartments.noSubMinistries")}
            </p>
          ) : (
            <ul>
              {department.subMinistries.map((sm, idx) => (
                <li
                  key={sm.id}
                  className="grid grid-cols-[28px_1fr_auto] items-center gap-3 border-t border-[var(--hairline)] py-4"
                >
                  <Serial n={idx + 1} />
                  <span className="font-display text-lg text-[var(--ink)]">{sm.name}</span>
                  {sm.leadUserId && sm.leadFirstName && sm.leadLastName ? (
                    <div className="flex items-center gap-2">
                      <InitialsAvatar
                        firstName={sm.leadFirstName}
                        lastName={sm.leadLastName}
                        avatarUrl={sm.leadAvatarUrl ?? undefined}
                        size="xs"
                      />
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
                        {sm.leadFirstName} {sm.leadLastName.charAt(0)}.
                      </span>
                    </div>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-4)]">
                      {t("pages.authDepartments.subMinistry.noLead", "Sans responsable")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
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
        <FormContent className={isMobile ? "overflow-y-auto" : "max-h-[90vh] overflow-y-auto sm:max-w-2xl"}>
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
        <FormContent className={isMobile ? "overflow-y-auto" : "max-h-[90vh] overflow-y-auto sm:max-w-2xl"}>
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
        <FormContent className={isMobile ? "overflow-y-auto" : "max-h-[90vh] overflow-y-auto sm:max-w-2xl"}>
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
                  isEditing
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
                  isEditing
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
              variant="destructive"
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

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "staffed" | "gaps";
}) {
  const color =
    tone === "gaps"
      ? "text-[var(--gaps)]"
      : tone === "staffed"
        ? "text-[var(--staffed)]"
        : "text-[var(--ink)]";
  return (
    <div className="flex flex-col sm:px-6 first:sm:pl-0 last:sm:pr-0">
      <Eyebrow>{label}</Eyebrow>
      <span className={`numerator mt-3 text-5xl sm:text-6xl ${color}`}>{value}</span>
    </div>
  );
}
