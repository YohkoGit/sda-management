import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { departmentService } from "@/services/departmentService";
import { userService } from "@/services/userService";
import type { SubMinistryResponse } from "@/services/departmentService";

interface SubMinistryManagerProps {
  departmentId: number;
  subMinistries: SubMinistryResponse[];
}

const NO_LEAD = "__none__";

export function SubMinistryManager({
  departmentId,
  subMinistries,
}: SubMinistryManagerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLeadUserId, setNewLeadUserId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLeadUserId, setEditLeadUserId] = useState<number | null>(null);

  // Self-contained data fetching for department members.
  // Use same queryKey + shape as useAssignableOfficers so the cache stays consistent.
  const { data: officersData } = useQuery({
    queryKey: ["assignable-officers"],
    queryFn: async () => {
      const res = await userService.getAssignableOfficers();
      return res.data.items;
    },
    staleTime: 5 * 60 * 1000,
  });

  const departmentMembers = useMemo(() => {
    if (!officersData) return [];
    return officersData.filter((o) =>
      o.departments.some((d) => d.id === departmentId)
    );
  }, [officersData, departmentId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["departments"] });
    queryClient.invalidateQueries({
      queryKey: ["departments", departmentId],
    });
  };

  const addMutation = useMutation({
    mutationFn: (data: { name: string; leadUserId?: number | null }) =>
      departmentService.addSubMinistry(departmentId, data),
    onSuccess: () => {
      invalidate();
      toast.success(t("pages.adminDepartments.subMinistry.addSuccess"));
      setIsAdding(false);
      setNewName("");
      setNewLeadUserId(null);
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error(t("pages.adminDepartments.conflictError"));
      } else if (isAxiosError(error) && error.response?.status === 400) {
        toast.error(t("pages.authDepartments.subMinistry.leadValidationError"));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      name,
      leadUserId,
    }: {
      id: number;
      name: string;
      leadUserId?: number | null;
    }) => departmentService.updateSubMinistry(departmentId, id, { name, leadUserId }),
    onSuccess: () => {
      invalidate();
      toast.success(t("pages.adminDepartments.subMinistry.updateSuccess"));
      setEditingId(null);
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error(t("pages.adminDepartments.conflictError"));
      } else if (isAxiosError(error) && error.response?.status === 400) {
        toast.error(t("pages.authDepartments.subMinistry.leadValidationError"));
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

  const handleLeadSelectChange = (
    value: string,
    setter: (v: number | null) => void
  ) => {
    setter(value === NO_LEAD ? null : Number(value));
  };

  const renderLeadPicker = (
    value: number | null,
    onChange: (v: number | null) => void
  ) => (
    <Select
      value={value != null ? String(value) : NO_LEAD}
      onValueChange={(v) => handleLeadSelectChange(v, onChange)}
    >
      <SelectTrigger className="h-8 w-full" size="sm">
        <SelectValue
          placeholder={t("pages.authDepartments.subMinistry.selectLead")}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_LEAD}>
          {t("pages.authDepartments.subMinistry.noLead")}
        </SelectItem>
        {departmentMembers.map((member) => (
          <SelectItem key={member.userId} value={String(member.userId)}>
            {member.firstName} {member.lastName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderLeadDisplay = (sm: SubMinistryResponse) => {
    if (!sm.leadUserId || !sm.leadFirstName || !sm.leadLastName) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    return (
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
    );
  };

  return (
    <div className="space-y-3">
      {subMinistries.map((sm) => (
        <div key={sm.id}>
          {editingId === sm.id ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Confirm"
                  className="h-8 w-8 min-h-[44px] min-w-[44px] shrink-0"
                  onClick={() =>
                    editName.trim() &&
                    updateMutation.mutate({
                      id: sm.id,
                      name: editName,
                      leadUserId: editLeadUserId,
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Cancel"
                  className="h-8 w-8 min-h-[44px] min-w-[44px] shrink-0"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {renderLeadPicker(editLeadUserId, setEditLeadUserId)}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{sm.name}</div>
                {renderLeadDisplay(sm)}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit"
                className="h-8 w-8 min-h-[44px] min-w-[44px] shrink-0"
                onClick={() => {
                  setEditingId(sm.id);
                  setEditName(sm.name);
                  setEditLeadUserId(sm.leadUserId ?? null);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete"
                className="h-8 w-8 min-h-[44px] min-w-[44px] shrink-0"
                onClick={() => deleteMutation.mutate(sm.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ))}

      {isAdding ? (
        <div className="space-y-2">
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
              aria-label="Confirm"
              className="h-8 w-8 min-h-[44px] min-w-[44px] shrink-0"
              onClick={() =>
                newName.trim() &&
                addMutation.mutate({
                  name: newName,
                  leadUserId: newLeadUserId,
                })
              }
              disabled={addMutation.isPending}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cancel"
              className="h-8 w-8 min-h-[44px] min-w-[44px] shrink-0"
              onClick={() => {
                setIsAdding(false);
                setNewName("");
                setNewLeadUserId(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          {renderLeadPicker(newLeadUserId, setNewLeadUserId)}
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
