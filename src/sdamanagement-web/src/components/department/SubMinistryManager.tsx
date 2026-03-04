import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { departmentService } from "@/services/departmentService";
import type { SubMinistryResponse } from "@/services/departmentService";

interface SubMinistryManagerProps {
  departmentId: number;
  subMinistries: SubMinistryResponse[];
}

export function SubMinistryManager({
  departmentId,
  subMinistries,
}: SubMinistryManagerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["departments"] });
    queryClient.invalidateQueries({
      queryKey: ["departments", departmentId],
    });
  };

  const addMutation = useMutation({
    mutationFn: (name: string) =>
      departmentService.addSubMinistry(departmentId, { name }),
    onSuccess: () => {
      invalidate();
      toast.success(t("pages.adminDepartments.subMinistry.addSuccess"));
      setIsAdding(false);
      setNewName("");
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error(t("pages.adminDepartments.conflictError"));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      departmentService.updateSubMinistry(departmentId, id, { name }),
    onSuccess: () => {
      invalidate();
      toast.success(t("pages.adminDepartments.subMinistry.updateSuccess"));
      setEditingId(null);
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error(t("pages.adminDepartments.conflictError"));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      departmentService.deleteSubMinistry(departmentId, id),
    onSuccess: () => {
      invalidate();
      toast.success(t("pages.adminDepartments.subMinistry.deleteSuccess"));
    },
    onError: () => {
      toast.error(t("pages.adminDepartments.subMinistry.deleteError"));
    },
  });

  return (
    <div className="space-y-2">
      {subMinistries.map((sm) => (
        <div key={sm.id} className="flex items-center gap-2">
          {editingId === sm.id ? (
            <>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() =>
                  editName.trim() &&
                  updateMutation.mutate({ id: sm.id, name: editName })
                }
                disabled={updateMutation.isPending}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setEditingId(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm">{sm.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  setEditingId(sm.id);
                  setEditName(sm.name);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => deleteMutation.mutate(sm.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t(
              "pages.adminDepartments.form.subMinistryPlaceholder"
            )}
            className="h-8"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => newName.trim() && addMutation.mutate(newName)}
            disabled={addMutation.isPending}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              setIsAdding(false);
              setNewName("");
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t("pages.adminDepartments.form.addSubMinistry")}
        </Button>
      )}
    </div>
  );
}
