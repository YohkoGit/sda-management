import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeAppLanguage } from "@/stores/uiStore";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const nextLang = currentLang === "fr" ? "en" : "fr";

  const handleToggle = () => {
    changeAppLanguage(i18n, nextLang);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      aria-label={t("nav.language.switchTo", { lang: nextLang.toUpperCase() })}
      className="gap-1.5"
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-medium uppercase">{currentLang}</span>
    </Button>
  );
}
