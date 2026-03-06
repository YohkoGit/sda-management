import api from "@/lib/api";

export interface SetupStepItem {
  id: string;
  status: string;
}

export interface SetupProgressResponse {
  steps: SetupStepItem[];
  isSetupComplete: boolean;
}

export const setupProgressService = {
  getSetupProgress: () =>
    api.get<SetupProgressResponse>("/api/setup-progress").then((res) => res.data),
};
