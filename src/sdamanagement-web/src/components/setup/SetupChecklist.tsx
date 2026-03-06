import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Check, Circle } from "lucide-react";
import { useSetupProgress, type EnrichedSetupStep } from "@/hooks/useSetupProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function StepIndicator({ step }: { step: EnrichedSetupStep }) {
  const { t } = useTranslation();

  if (step.status === "complete") {
    return (
      <Link to={step.route} className="flex items-center gap-3 py-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-4 w-4 text-emerald-600" />
        </span>
        <span className="text-slate-700">{t(step.labelKey)}</span>
      </Link>
    );
  }

  if (step.status === "current") {
    return (
      <Link
        to={step.route}
        className="flex items-center gap-3 py-2"
        aria-current="step"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-indigo-600 motion-safe:animate-pulse">
          <Circle className="h-4 w-4 text-indigo-600" />
        </span>
        <span className="flex flex-col">
          <span className="text-slate-900 font-semibold">{t(step.labelKey)}</span>
          <span className="text-sm text-indigo-600 font-medium">
            {t("setup.startHere")}
          </span>
        </span>
      </Link>
    );
  }

  // pending
  return (
    <span className="flex items-center gap-3 py-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full">
        <Circle className="h-4 w-4 text-slate-300" />
      </span>
      <span className="text-slate-400">{t(step.labelKey)}</span>
    </span>
  );
}

export function SetupChecklist() {
  const { t } = useTranslation();
  const { steps, isSetupComplete, isLoading, isError } = useSetupProgress();

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  if (isError) {
    return null;
  }

  if (steps.length === 0) {
    return null;
  }

  if (isSetupComplete) {
    return (
      <Card className="rounded-2xl">
        <CardContent>
          <p className="text-emerald-700 font-semibold">{t("setup.complete")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{t("setup.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <nav aria-label={t("setup.ariaLabel")}>
          <ol className="space-y-1">
            {steps.map((step) => (
              <li key={step.id}>
                <StepIndicator step={step} />
              </li>
            ))}
          </ol>
        </nav>
      </CardContent>
    </Card>
  );
}
