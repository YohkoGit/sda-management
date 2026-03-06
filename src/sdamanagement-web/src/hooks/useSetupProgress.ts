import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  setupProgressService,
  type SetupProgressResponse,
} from "@/services/setupProgressService";

const STEP_CONFIG: Record<string, { route: string; labelKey: string }> = {
  "church-config": { route: "/admin/settings", labelKey: "setup.steps.churchSettings" },
  "departments": { route: "/admin/departments", labelKey: "setup.steps.departments" },
  "templates": { route: "/admin/activity-templates", labelKey: "setup.steps.templates" },
  "schedules": { route: "/admin/program-schedules", labelKey: "setup.steps.schedules" },
  "members": { route: "/admin/users", labelKey: "setup.steps.members" },
};
// TODO(story-4.1): Add "first-activity" step

export interface EnrichedSetupStep {
  id: string;
  status: string;
  route: string;
  labelKey: string;
}

export function useSetupProgress() {
  const { user } = useAuth();
  const isOwner = user?.role?.toUpperCase() === "OWNER";

  const { data, isLoading, isError } = useQuery<SetupProgressResponse>({
    queryKey: ["setup-progress"],
    queryFn: setupProgressService.getSetupProgress,
    enabled: isOwner,
  });

  const steps: EnrichedSetupStep[] =
    data?.steps.map((step) => ({
      ...step,
      route: STEP_CONFIG[step.id]?.route ?? "",
      labelKey: STEP_CONFIG[step.id]?.labelKey ?? step.id,
    })) ?? [];

  return {
    steps,
    isSetupComplete: data?.isSetupComplete ?? false,
    isLoading,
    isError,
  };
}
