import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createActivitySchema,
  type CreateActivityFormData,
} from "@/schemas/activitySchema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface MeetingFormProps {
  departmentId: number;
  onSubmit: (data: CreateActivityFormData) => void;
  isPending: boolean;
  defaultValues?: Partial<CreateActivityFormData>;
}

export function MeetingForm({
  departmentId,
  onSubmit,
  isPending,
  defaultValues,
}: MeetingFormProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateActivityFormData>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      departmentId,
      visibility: "authenticated",
      isMeeting: true,
      meetingType: undefined,
      zoomLink: "",
      locationName: "",
      locationAddress: "",
      ...defaultValues,
      // Force these hidden values regardless of defaultValues
    },
    mode: "onBlur",
  });

  const meetingType = watch("meetingType");

  // Ensure hidden fields stay correct
  const handleFormSubmit = (data: CreateActivityFormData) => {
    onSubmit({
      ...data,
      isMeeting: true,
      departmentId,
      visibility: "authenticated",
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">

      <div>
        <Label htmlFor="meeting-title">{t("meetingForm.title")}</Label>
        <Input
          id="meeting-title"
          placeholder={t("meetingForm.title")}
          className={`min-h-[44px] ${errors.title ? "border-red-500" : ""}`}
          {...register("title")}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="meeting-description">{t("meetingForm.description")}</Label>
        <Textarea
          id="meeting-description"
          placeholder={t("meetingForm.description")}
          className={`min-h-[44px] ${errors.description ? "border-red-500" : ""}`}
          {...register("description")}
        />
      </div>

      <div>
        <Label htmlFor="meeting-date">{t("meetingForm.date")}</Label>
        <Input
          id="meeting-date"
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
          <Label htmlFor="meeting-startTime">{t("meetingForm.startTime")}</Label>
          <Input
            id="meeting-startTime"
            type="time"
            className={`min-h-[44px] ${errors.startTime ? "border-red-500" : ""}`}
            {...register("startTime")}
          />
          {errors.startTime && (
            <p className="mt-1 text-sm text-red-500">{errors.startTime.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="meeting-endTime">{t("meetingForm.endTime")}</Label>
          <Input
            id="meeting-endTime"
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
        <Label>{t("meetingForm.meetingType")}</Label>
        <div className="mt-2 flex gap-4">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="zoom"
              checked={meetingType === "zoom"}
              onChange={() => {
                setValue("meetingType", "zoom", { shouldValidate: true });
                setValue("locationName", "");
                setValue("locationAddress", "");
              }}
              className="h-4 w-4"
            />
            {t("meetingForm.zoom")}
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="physical"
              checked={meetingType === "physical"}
              onChange={() => {
                setValue("meetingType", "physical", { shouldValidate: true });
                setValue("zoomLink", "");
              }}
              className="h-4 w-4"
            />
            {t("meetingForm.physical")}
          </label>
        </div>
        {errors.meetingType && (
          <p className="mt-1 text-sm text-red-500">{errors.meetingType.message}</p>
        )}
      </div>

      {meetingType === "zoom" && (
        <div>
          <Label htmlFor="meeting-zoomLink">{t("meetingForm.zoomLink")}</Label>
          <Input
            id="meeting-zoomLink"
            type="url"
            placeholder={t("meetingForm.zoomLinkPlaceholder")}
            className={`min-h-[44px] ${errors.zoomLink ? "border-red-500" : ""}`}
            {...register("zoomLink")}
          />
          {errors.zoomLink && (
            <p className="mt-1 text-sm text-red-500">{errors.zoomLink.message}</p>
          )}
        </div>
      )}

      {meetingType === "physical" && (
        <>
          <div>
            <Label htmlFor="meeting-locationName">{t("meetingForm.locationName")}</Label>
            <Input
              id="meeting-locationName"
              placeholder={t("meetingForm.locationNamePlaceholder")}
              className={`min-h-[44px] ${errors.locationName ? "border-red-500" : ""}`}
              {...register("locationName")}
            />
            {errors.locationName && (
              <p className="mt-1 text-sm text-red-500">{errors.locationName.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="meeting-locationAddress">{t("meetingForm.locationAddress")}</Label>
            <Input
              id="meeting-locationAddress"
              placeholder={t("meetingForm.locationAddressPlaceholder")}
              className={`min-h-[44px] ${errors.locationAddress ? "border-red-500" : ""}`}
              {...register("locationAddress")}
            />
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} className="min-h-[44px]">
          {isPending ? t("meetingForm.submitting") : t("meetingForm.submit")}
        </Button>
      </div>
    </form>
  );
}
