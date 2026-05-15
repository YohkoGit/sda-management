import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Wordmark, Eyebrow } from "@/components/ui/typography";
import { useChurchInfo } from "@/hooks/usePublicDashboard";

export default function PublicFooter() {
  const { t } = useTranslation();
  const { data: churchInfo } = useChurchInfo();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--hairline)] bg-[var(--parchment-2)]">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Wordmark
              size="lg"
              subtitle={t("app.churchSubtitle", "Église Adventiste · 2026")}
            />
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[var(--ink-3)]">
              {churchInfo?.welcomeMessage ?? t("app.tagline", "Maison de prière, de chant et de service depuis la fondation.")}
            </p>
          </div>

          <div>
            <Eyebrow>{t("layout.footer.contact", "Direction")}</Eyebrow>
            <ul className="mt-4 space-y-2 text-sm text-[var(--ink-2)]">
              {churchInfo?.address && (
                <li>{churchInfo.address}</li>
              )}
              {churchInfo?.phoneNumber && (
                <li className="font-mono tabular-nums">{churchInfo.phoneNumber}</li>
              )}
            </ul>
          </div>

          <div>
            <Eyebrow>{t("layout.footer.navigate", "Naviguer")}</Eyebrow>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link to="/" className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                  {t("nav.public.home")}
                </Link>
              </li>
              <li>
                <Link to="/calendar" className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                  {t("nav.public.calendar")}
                </Link>
              </li>
              <li>
                <Link to="/departments" className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                  {t("nav.public.departments")}
                </Link>
              </li>
              <li>
                <Link to="/live" className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                  {t("nav.public.live")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start gap-2 border-t border-[var(--hairline)] pt-6 text-xs text-[var(--ink-3)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {churchInfo?.churchName ?? t("app.churchName")}</p>
          <Eyebrow gilt asChild>
            <p>✣ Soli Deo gloria</p>
          </Eyebrow>
        </div>
      </div>
    </footer>
  );
}
