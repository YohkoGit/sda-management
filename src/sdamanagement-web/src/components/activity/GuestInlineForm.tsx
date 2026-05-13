import { useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GuestInlineFormProps {
  defaultName: string;
  onSubmit: (data: { name: string; phone?: string }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function GuestInlineForm({
  defaultName,
  onSubmit,
  onCancel,
  isSubmitting,
}: GuestInlineFormProps) {
  const { t } = useTranslation();
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    const name = nameRef.current?.value.trim() ?? "";
    if (name.length < 2) return;
    const phone = phoneRef.current?.value.trim() || undefined;
    onSubmit({ name, phone });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleCreate();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
          aria-label={t("pages.adminActivities.contactPicker.guestBack")}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {t("pages.adminActivities.contactPicker.guestBack")}
        </span>
      </div>
      <Input
        ref={nameRef}
        defaultValue={defaultName}
        placeholder={t("pages.adminActivities.contactPicker.guestName")}
        aria-label={t("pages.adminActivities.contactPicker.guestName")}
        required
        minLength={2}
        maxLength={100}
        autoFocus
        onKeyDown={handleKeyDown}
        disabled={isSubmitting}
      />
      <Input
        ref={phoneRef}
        type="tel"
        placeholder={t("pages.adminActivities.contactPicker.guestPhone")}
        aria-label={t("pages.adminActivities.contactPicker.guestPhone")}
        maxLength={20}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        disabled={isSubmitting}
      />
      <Button
        type="button"
        size="sm"
        disabled={isSubmitting}
        onClick={handleCreate}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("pages.adminActivities.contactPicker.guestCreating")}
          </>
        ) : (
          t("pages.adminActivities.contactPicker.createGuest")
        )}
      </Button>
    </div>
  );
}
