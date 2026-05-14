import { useTranslation } from "react-i18next";
import { changeAppLanguage } from "@/stores/uiStore";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const nextLang = currentLang === "fr" ? "en" : "fr";

  const handleToggle = () => {
    changeAppLanguage(i18n, nextLang);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={t("nav.language.switchTo", { lang: nextLang.toUpperCase() })}
      className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)] transition-colors hover:border-[var(--hairline-2)] hover:bg-[var(--parchment-2)] hover:text-[var(--ink)]"
    >
      <span className={currentLang === "fr" ? "text-[var(--ink)]" : ""}>FR</span>
      <span aria-hidden className="text-[var(--ink-4)]">/</span>
      <span className={currentLang === "en" ? "text-[var(--ink)]" : ""}>EN</span>
    </button>
  );
}
