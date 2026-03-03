import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-black">404</h1>
      <p className="text-lg text-muted-foreground">{t("pages.notFound.message")}</p>
      <Button asChild>
        <Link to="/">{t("pages.notFound.backHome")}</Link>
      </Button>
    </div>
  );
}
