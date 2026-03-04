import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  churchConfigSchema,
  type ChurchConfigFormData,
} from "@/schemas/configSchema";
import {
  configService,
  type ChurchConfigResponse,
} from "@/services/configService";

interface ChurchIdentityFormProps {
  existingConfig?: ChurchConfigResponse | null;
}

export function ChurchIdentityForm({ existingConfig }: ChurchIdentityFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isFirstSetup = !existingConfig;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ChurchConfigFormData>({
    resolver: zodResolver(churchConfigSchema),
    defaultValues: existingConfig
      ? {
          churchName: existingConfig.churchName,
          address: existingConfig.address,
          youTubeChannelUrl: existingConfig.youTubeChannelUrl ?? "",
          phoneNumber: existingConfig.phoneNumber ?? "",
          welcomeMessage: existingConfig.welcomeMessage ?? "",
          defaultLocale: existingConfig.defaultLocale as "fr" | "en",
        }
      : {
          churchName: "",
          address: "",
          youTubeChannelUrl: "",
          phoneNumber: "",
          welcomeMessage: "",
          defaultLocale: "fr",
        },
    mode: "onBlur",
  });

  const mutation = useMutation({
    mutationFn: (data: ChurchConfigFormData) => configService.update(data),
    onSuccess: (response) => {
      const d = response.data;
      reset({
        churchName: d.churchName,
        address: d.address,
        youTubeChannelUrl: d.youTubeChannelUrl ?? "",
        phoneNumber: d.phoneNumber ?? "",
        welcomeMessage: d.welcomeMessage ?? "",
        defaultLocale: d.defaultLocale as "fr" | "en",
      });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success(t("pages.settings.churchIdentity.saveSuccess"));
    },
    onError: () => {
      toast.error(t("pages.settings.churchIdentity.saveError"));
    },
  });

  const onSubmit = (data: ChurchConfigFormData) => {
    mutation.mutate(data);
  };

  const prefix = "pages.settings.churchIdentity";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(`${prefix}.title`)}</CardTitle>
        {isFirstSetup && (
          <CardDescription>
            {t(`${prefix}.emptyStateHelper`)}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {isFirstSetup && (
          <p className="mb-6 text-sm font-medium text-primary">
            {t(`${prefix}.emptyState`)}
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="churchName">{t(`${prefix}.churchName`)}</Label>
            <Input
              id="churchName"
              className="min-h-[44px]"
              placeholder={t(`${prefix}.churchNamePlaceholder`)}
              aria-invalid={!!errors.churchName}
              aria-describedby={errors.churchName ? "churchName-error" : undefined}
              {...register("churchName")}
            />
            {errors.churchName && (
              <p id="churchName-error" className="text-sm text-destructive">
                {errors.churchName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t(`${prefix}.address`)}</Label>
            <Input
              id="address"
              className="min-h-[44px]"
              placeholder={t(`${prefix}.addressPlaceholder`)}
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? "address-error" : undefined}
              {...register("address")}
            />
            {errors.address && (
              <p id="address-error" className="text-sm text-destructive">
                {errors.address.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="youTubeChannelUrl">
              {t(`${prefix}.youtubeChannelUrl`)}
            </Label>
            <Input
              id="youTubeChannelUrl"
              type="url"
              className="min-h-[44px]"
              placeholder={t(`${prefix}.youtubeChannelUrlPlaceholder`)}
              aria-invalid={!!errors.youTubeChannelUrl}
              aria-describedby={
                errors.youTubeChannelUrl ? "youTubeChannelUrl-error" : undefined
              }
              {...register("youTubeChannelUrl")}
            />
            {errors.youTubeChannelUrl && (
              <p id="youTubeChannelUrl-error" className="text-sm text-destructive">
                {errors.youTubeChannelUrl.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">{t(`${prefix}.phoneNumber`)}</Label>
            <Input
              id="phoneNumber"
              type="tel"
              className="min-h-[44px]"
              placeholder={t(`${prefix}.phoneNumberPlaceholder`)}
              aria-invalid={!!errors.phoneNumber}
              aria-describedby={errors.phoneNumber ? "phoneNumber-error" : undefined}
              {...register("phoneNumber")}
            />
            {errors.phoneNumber && (
              <p id="phoneNumber-error" className="text-sm text-destructive">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">
              {t(`${prefix}.welcomeMessage`)}
            </Label>
            <Textarea
              id="welcomeMessage"
              placeholder={t(`${prefix}.welcomeMessagePlaceholder`)}
              aria-invalid={!!errors.welcomeMessage}
              aria-describedby={
                errors.welcomeMessage ? "welcomeMessage-error" : undefined
              }
              {...register("welcomeMessage")}
            />
            {errors.welcomeMessage && (
              <p id="welcomeMessage-error" className="text-sm text-destructive">
                {errors.welcomeMessage.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultLocale">
              {t(`${prefix}.defaultLocale`)}
            </Label>
            <Controller
              name="defaultLocale"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="defaultLocale" className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">
                      {t(`${prefix}.localeFr`)}
                    </SelectItem>
                    <SelectItem value="en">
                      {t(`${prefix}.localeEn`)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.defaultLocale && (
              <p className="text-sm text-destructive">
                {errors.defaultLocale.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="min-h-[44px]"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t(`${prefix}.save`)
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
