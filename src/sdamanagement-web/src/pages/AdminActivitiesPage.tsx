import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import RoleRosterEditor from "@/components/activity/RoleRosterEditor";
import { departmentService, type DepartmentListItem } from "@/services/departmentService";
import {
  createActivitySchema,
  SPECIAL_TYPES,
  type CreateActivityFormData,
  type UpdateActivityFormData,
} from "@/schemas/activitySchema";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { AxiosError } from "axios";

function ActivityForm({
  onSubmit,
  isPending,
  departments,
  defaultValues,
  existingAssignments,
}: {
  onSubmit: (data: CreateActivityFormData) => void;
  isPending: boolean;
  departments: DepartmentListItem[];
  defaultValues?: Partial<CreateActivityFormData>;
  existingAssignments?: Map<number, number>;
}) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CreateActivityFormData>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      departmentId: 0,
      visibility: "public",
      roles: [],
      ...defaultValues,
    },
    mode: "onBlur",
  });

  const visibility = watch("visibility");
  const departmentId = watch("departmentId");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">{t("pages.adminActivities.form.title")}</Label>
        <Input
          id="title"
          placeholder={t("pages.adminActivities.form.titlePlaceholder")}
          className={`min-h-[44px] ${errors.title ? "border-red-500" : ""}`}
          {...register("title")}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">{t("pages.adminActivities.form.description")}</Label>
        <Textarea
          id="description"
          placeholder={t("pages.adminActivities.form.descriptionPlaceholder")}
          className={`min-h-[44px] ${errors.description ? "border-red-500" : ""}`}
          {...register("description")}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="date">{t("pages.adminActivities.form.date")}</Label>
        <Input
          id="date"
          type="date"
          className={`min-h-[44px] ${errors.date ? "border-red-500" : ""}`}
          {...register("date")}
        />
        {errors.date && (
          <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">{t("pages.adminActivities.form.startTime")}</Label>
          <Input
            id="startTime"
            type="time"
            className={`min-h-[44px] ${errors.startTime ? "border-red-500" : ""}`}
            {...register("startTime")}
          />
          {errors.startTime && (
            <p className="mt-1 text-sm text-red-500">{errors.startTime.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="endTime">{t("pages.adminActivities.form.endTime")}</Label>
          <Input
            id="endTime"
            type="time"
            className={`min-h-[44px] ${errors.endTime ? "border-red-500" : ""}`}
            {...register("endTime")}
          />
          {errors.endTime && (
            <p className="mt-1 text-sm text-red-500">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label>{t("pages.adminActivities.form.department")}</Label>
        <Select
          value={departmentId ? String(departmentId) : ""}
          onValueChange={(val) => setValue("departmentId", Number(val), { shouldValidate: true })}
        >
          <SelectTrigger className={`min-h-[44px] ${errors.departmentId ? "border-red-500" : ""}`}>
            <SelectValue placeholder={t("pages.adminActivities.form.department")} />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={String(dept.id)}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: dept.color }}
                  />
                  {dept.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.departmentId && (
          <p className="mt-1 text-sm text-red-500">{errors.departmentId.message}</p>
        )}
      </div>

      <div>
        <Label>{t("pages.adminActivities.form.visibility")}</Label>
        <div className="mt-2 flex gap-4">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="public"
              checked={visibility === "public"}
              onChange={() => setValue("visibility", "public")}
              className="h-4 w-4"
            />
            {t("pages.adminActivities.form.visibilityPublic")}
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="authenticated"
              checked={visibility === "authenticated"}
              onChange={() => setValue("visibility", "authenticated")}
              className="h-4 w-4"
            />
            {t("pages.adminActivities.form.visibilityAuthenticated")}
          </label>
        </div>
      </div>

      <div>
        <Label>{t("pages.adminActivities.form.specialType")}</Label>
        <Controller
          name="specialType"
          control={control}
          render={({ field, fieldState }) => (
            <Select
              value={field.value ?? "none"}
              onValueChange={(val) => field.onChange(val === "none" ? null : val)}
            >
              <SelectTrigger
                className={`min-h-[44px] ${fieldState.invalid ? "border-red-500" : ""}`}
                aria-label={t("pages.adminActivities.form.specialType")}
                aria-invalid={fieldState.invalid}
              >
                <SelectValue placeholder={t("pages.adminActivities.form.specialTypeNone")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("pages.adminActivities.form.specialTypeNone")}</SelectItem>
                {SPECIAL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`pages.adminActivities.specialType.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <Separator className="my-4" />
      <div>
        <h3 className="text-lg font-semibold mb-3">
          {t("pages.adminActivities.roleRoster.title")}
        </h3>
        <RoleRosterEditor
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
          existingAssignments={existingAssignments}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} className="min-h-[44px]">
          {isPending
            ? t("pages.adminActivities.form.saving")
            : t("pages.adminActivities.form.save")}
        </Button>
      </div>
    </form>
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
    mutationFn: ({ id, data }: { id: number; data: UpdateActivityFormData }) =>
      activityService.update(id, {
        ...data,
        startTime: data.startTime.length === 5 ? data.startTime + ":00" : data.startTime,
        endTime: data.endTime.length === 5 ? data.endTime + ":00" : data.endTime,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setEditActivity(null);
      toast.success(t("pages.adminActivities.toast.updated"));
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === 409) {
        toast.error(t("pages.adminActivities.conflictError"));
      } else if (error.response?.status === 422) {
        toast.error(t("pages.adminActivities.assignmentError"));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => activityService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
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
                <TableHead className="hidden sm:table-cell">
                  {t("pages.adminActivities.form.visibility")}
                </TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium">
                    {activity.title}
                    {activity.specialType && (
                      <Badge variant="secondary" className="ml-2 max-w-[10rem] truncate text-xs" data-testid="special-type-badge">
                        {t(`pages.adminActivities.specialType.${activity.specialType}`)}
                      </Badge>
                    )}
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
                        onClick={() => handleEdit(activity)}
                        aria-label={t("pages.adminActivities.form.editTitle")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] text-destructive"
                        onClick={() => setDeleteTarget(activity)}
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
      {editActivity && (
        <FormWrapper open={!!editActivity} onOpenChange={(open) => !open && setEditActivity(null)}>
          <FormContent side={isMobile ? "bottom" : undefined} className={isMobile ? "h-[90vh]" : ""}>
            <FormHeader>
              <FormTitle>{t("pages.adminActivities.form.editTitle")}</FormTitle>
            </FormHeader>
            <div className={isMobile ? "overflow-y-auto flex-1 px-1" : ""}>
              <ActivityForm
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
              />
            </div>
          </FormContent>
        </FormWrapper>
      )}

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
              className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t("pages.adminActivities.deleteConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
