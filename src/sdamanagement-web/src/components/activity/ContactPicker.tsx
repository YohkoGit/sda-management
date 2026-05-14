import { type ReactNode, useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ContactPickerGroup } from "./ContactPickerGroup";
import GuestInlineForm from "./GuestInlineForm";
import { groupByDepartment } from "@/hooks/useAssignableOfficers";
import type { AssignableOfficer } from "@/services/userService";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

interface ContactPickerProps {
  officers: AssignableOfficer[];
  assignedUserIds: number[];
  headcount: number;
  roleName: string;
  onSelect: (userId: number) => void;
  onOpenChange?: (open: boolean) => void;
  onCreateGuest?: (data: { name: string; phone?: string }) => void;
  trigger: ReactNode;
  frequentUserIds?: number[];
}

export default function ContactPicker({
  officers,
  assignedUserIds,
  headcount,
  roleName,
  onSelect,
  onOpenChange,
  onCreateGuest,
  trigger,
  frequentUserIds = [],
}: ContactPickerProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isFullyStaffed = assignedUserIds.length >= headcount;

  const updateOpen = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      setShowAll(false);
      setSearch("");
      setShowGuestForm(false);
    }
  };

  const handleSelect = (userId: number) => {
    onSelect(userId);
    updateOpen(false);
  };

  // Return focus to trigger on close
  useEffect(() => {
    if (!open && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [open]);

  const groups = groupByDepartment(officers);
  const frequentOfficers = frequentUserIds.length > 0
    ? officers.filter((o) => frequentUserIds.includes(o.userId)).slice(0, 5)
    : [];

  const hasMoreThanLimit = officers.length > 20;
  const isSearching = search.length > 0;
  const noFilteredResults = isSearching && officers.length > 0 &&
    !officers.some(o =>
      normalize(`${o.lastName} ${o.firstName}`).includes(normalize(search))
    );

  const guestFormContent = onCreateGuest ? (
    <GuestInlineForm
      defaultName={search}
      onSubmit={async (data) => {
        setIsCreatingGuest(true);
        try {
          await onCreateGuest(data);
          updateOpen(false);
        } catch {
          // Error handled by parent (toast) — form stays open
        } finally {
          setIsCreatingGuest(false);
        }
      }}
      onCancel={() => setShowGuestForm(false)}
      isSubmitting={isCreatingGuest}
    />
  ) : null;

  const commandContent = showGuestForm && guestFormContent ? guestFormContent : (
    <Command
      filter={(value, search) =>
        normalize(value).includes(normalize(search)) ? 1 : 0
      }
    >
      <CommandInput
        placeholder={t("pages.adminActivities.contactPicker.searchPlaceholder")}
        aria-label={t("pages.adminActivities.contactPicker.searchPlaceholder")}
        autoFocus
        value={search}
        onValueChange={setSearch}
        onKeyDown={(e) => {
          if (e.key === "Enter" && noFilteredResults && onCreateGuest) {
            e.preventDefault();
            setShowGuestForm(true);
          }
        }}
      />
      <CommandList
        className={showAll || isSearching ? "max-h-[400px]" : "max-h-[300px]"}
        aria-live="polite"
      >
        {officers.length === 0 ? (
          <div className="p-3 text-center text-sm text-muted-foreground">
            {t("pages.adminActivities.contactPicker.emptySystem")}
          </div>
        ) : (
          <>
            <CommandEmpty>
              <span className="block text-sm text-muted-foreground">
                {t("pages.adminActivities.contactPicker.noResults")}
              </span>
              {onCreateGuest && (
                <button
                  type="button"
                  data-testid="add-guest-button"
                  className="mt-1 text-xs text-primary hover:underline"
                  onClick={() => setShowGuestForm(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setShowGuestForm(true);
                    }
                  }}
                >
                  {t("pages.adminActivities.contactPicker.addGuest")}
                </button>
              )}
            </CommandEmpty>
            {frequentOfficers.length > 0 && (
              <ContactPickerGroup
                departmentName={t("pages.adminActivities.contactPicker.frequentlyAssigned")}
                officers={frequentOfficers}
                assignedUserIds={assignedUserIds}
                onSelect={handleSelect}
              />
            )}
            {groups.map((group) => (
              <ContactPickerGroup
                key={group.departmentName}
                departmentName={group.departmentName}
                officers={group.officers}
                assignedUserIds={assignedUserIds}
                onSelect={handleSelect}
              />
            ))}
          </>
        )}
      </CommandList>
      {hasMoreThanLimit && !isSearching && !showAll && (
        <button
          type="button"
          className="w-full border-t py-1.5 text-xs text-primary hover:underline"
          onClick={() => setShowAll(true)}
        >
          {t("pages.adminActivities.contactPicker.showMore")}
        </button>
      )}
    </Command>
  );

  const pillBase =
    "inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 font-sans text-xs text-[var(--ink-3)] min-h-[34px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gilt)]";
  const pillEnabled =
    "border-[var(--hairline-2)] hover:border-[var(--ink)] hover:bg-[var(--parchment-2)] hover:text-[var(--ink)]";
  const pillDisabled = "border-[var(--hairline)] opacity-60";

  const triggerButton = isFullyStaffed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <button
            ref={triggerRef}
            type="button"
            disabled
            className={[pillBase, pillDisabled].join(" ")}
            aria-label={t("pages.adminActivities.contactPicker.fullyStaffed")}
          >
            {trigger}
            <span>{t("pages.adminActivities.roleRoster.assignAction", "Attribuer")}</span>
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {t("pages.adminActivities.contactPicker.fullyStaffed")}
      </TooltipContent>
    </Tooltip>
  ) : (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => updateOpen(true)}
      className={[pillBase, pillEnabled].join(" ")}
      aria-label={t("pages.adminActivities.roleRoster.tapToAssign")}
    >
      {trigger}
      <span>{t("pages.adminActivities.roleRoster.assignAction", "Attribuer")}</span>
    </button>
  );

  // Desktop: Popover
  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={updateOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          {commandContent}
        </PopoverContent>
      </Popover>
    );
  }

  // Mobile: inline picker within the existing parent container
  if (open) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => updateOpen(false)}
            aria-label={t("common.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {t("pages.adminActivities.contactPicker.selectionFor", { role: roleName })}
          </span>
        </div>
        {commandContent}
      </div>
    );
  }

  return triggerButton;
}
