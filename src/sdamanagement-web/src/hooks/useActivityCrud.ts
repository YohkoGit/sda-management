import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import {
  activityService,
  type ActivityListItem,
  type ActivityResponse,
} from "@/services/activityService";
import { useActivityCacheInvalidation } from "@/hooks/useActivityCacheInvalidation";
import type {
  CreateActivityFormData,
  UpdateActivityFormData,
} from "@/schemas/activitySchema";

function normalizeTime(time: string): string {
  return time.length === 5 ? time + ":00" : time;
}

export interface UseActivityCrudConfig {
  /** If provided, cache invalidation is scoped to this department; otherwise invalidates all. */
  departmentId?: number;
  /** Translation keys (i18n) — at minimum the four required success/error toasts. */
  toastKeys: {
    created: string;
    /** Optional differentiated toast when `isMeeting` is true on create. */
    meetingCreated?: string;
    updated: string;
    deleted: string;
    conflictError: string;
    /** Optional toast on 422 from create/update (assignment validation failed). */
    assignmentError?: string;
    /** Optional toast on 400 from create when a template was selected (template missing). */
    templateError?: string;
    /** Optional toast when conflict reload succeeds. */
    conflictReloaded?: string;
    /** Optional toast when conflict reload fails. */
    conflictReloadError?: string;
    /** Optional toast when edit-mode fetch fails. */
    editLoadError?: string;
  };
  /** Called once create succeeds (after invalidation + toast). Use to close the form, reset wizard step, etc. */
  onCreated?: () => void;
  /** Called once update succeeds. Use for non-form-state cleanup. */
  onUpdated?: () => void;
  /** Called once delete succeeds. Use to close the confirm dialog. */
  onDeleted?: () => void;
  /**
   * For Admin pages: if a template was selected when create errors with 400,
   * we surface `toastKeys.templateError`. Return null if no template is involved.
   */
  hasSelectedTemplate?: () => boolean;
}

/**
 * Centralizes activity create/update/delete mutations, time normalization,
 * edit-mode fetch state, and the 409-conflict state machine.
 *
 * Originally duplicated across `AdminActivitiesPage` and `DepartmentDetailPage`
 * (~120 LOC each) — extracted in audit followup #2.
 */
export function useActivityCrud(config: UseActivityCrudConfig) {
  const { t } = useTranslation();
  const invalidate = useActivityCacheInvalidation();

  const invalidateAll = useCallback(() => {
    if (config.departmentId !== undefined) {
      void invalidate.invalidateDepartment(config.departmentId);
    } else {
      void invalidate.invalidateAll();
    }
  }, [invalidate, config.departmentId]);

  const [editActivity, setEditActivity] = useState<ActivityResponse | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [conflictState, setConflictState] = useState<{
    activityId: number;
    formData: UpdateActivityFormData;
  } | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: CreateActivityFormData) =>
      activityService.create({
        ...data,
        startTime: normalizeTime(data.startTime),
        endTime: normalizeTime(data.endTime),
      }),
    onSuccess: (_res, variables) => {
      invalidateAll();
      const key =
        variables.isMeeting && config.toastKeys.meetingCreated
          ? config.toastKeys.meetingCreated
          : config.toastKeys.created;
      toast.success(t(key));
      config.onCreated?.();
    },
    onError: (error: AxiosError) => {
      const status = error.response?.status;
      if (
        status === 400 &&
        config.hasSelectedTemplate?.() &&
        config.toastKeys.templateError
      ) {
        toast.error(t(config.toastKeys.templateError));
      } else if (status === 422 && config.toastKeys.assignmentError) {
        toast.error(t(config.toastKeys.assignmentError));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
      force,
    }: {
      id: number;
      data: UpdateActivityFormData;
      force?: boolean;
    }) =>
      activityService.update(
        id,
        {
          ...data,
          startTime: normalizeTime(data.startTime),
          endTime: normalizeTime(data.endTime),
        },
        force,
      ),
    onSuccess: () => {
      invalidateAll();
      setEditActivity(null);
      toast.success(t(config.toastKeys.updated));
      config.onUpdated?.();
    },
    onError: (error: AxiosError, variables) => {
      const status = error.response?.status;
      if (status === 409) {
        if (variables.force) {
          // Force-save also got 409: ultra-rare race; fall back to toast to
          // prevent infinite conflict-dialog loop.
          toast.error(t(config.toastKeys.conflictError));
        } else {
          setConflictState({ activityId: variables.id, formData: variables.data });
        }
      } else if (status === 422 && config.toastKeys.assignmentError) {
        toast.error(t(config.toastKeys.assignmentError));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => activityService.delete(id),
    onSuccess: () => {
      invalidateAll();
      toast.success(t(config.toastKeys.deleted));
      config.onDeleted?.();
    },
  });

  const handleEdit = useCallback(
    async (item: ActivityListItem) => {
      setIsEditLoading(true);
      try {
        const res = await activityService.getById(item.id);
        setEditActivity(res.data);
      } catch {
        if (config.toastKeys.editLoadError) {
          toast.error(t(config.toastKeys.editLoadError));
        }
      } finally {
        setIsEditLoading(false);
      }
    },
    [config.toastKeys.editLoadError, t],
  );

  const handleEditSubmit = useCallback(
    (data: CreateActivityFormData) => {
      if (!editActivity) return;
      updateMutation.mutate({
        id: editActivity.id,
        data: { ...data, concurrencyToken: editActivity.concurrencyToken },
      });
    },
    [editActivity, updateMutation],
  );

  const handleConflictReload = useCallback(async () => {
    if (!conflictState) return;
    const activityId = conflictState.activityId;
    setConflictState(null);
    try {
      const res = await activityService.getById(activityId);
      setEditActivity(res.data);
      if (config.toastKeys.conflictReloaded) {
        toast.success(t(config.toastKeys.conflictReloaded));
      }
    } catch {
      if (config.toastKeys.conflictReloadError) {
        toast.error(t(config.toastKeys.conflictReloadError));
      }
      setEditActivity(null);
    }
  }, [
    conflictState,
    config.toastKeys.conflictReloaded,
    config.toastKeys.conflictReloadError,
    t,
  ]);

  const handleConflictOverwrite = useCallback(() => {
    if (!conflictState) return;
    const { activityId, formData } = conflictState;
    setConflictState(null);
    updateMutation.mutate({ id: activityId, data: formData, force: true });
  }, [conflictState, updateMutation]);

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    editActivity,
    setEditActivity,
    isEditLoading,
    handleEdit,
    handleEditSubmit,
    conflictState,
    setConflictState,
    handleConflictReload,
    handleConflictOverwrite,
  };
}
