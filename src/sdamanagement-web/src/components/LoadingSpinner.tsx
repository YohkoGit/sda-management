import { useTranslation } from "react-i18next";

export default function LoadingSpinner() {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">{t("layout.loading")}</p>
      </div>
    </div>
  );
}
