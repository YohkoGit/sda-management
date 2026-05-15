import api from "@/lib/api";
import type { components } from "@/api-generated/schema";

type Schemas = components["schemas"];

export type SetupStepItem = NonNullable<Schemas["SetupStepItem"]>;
export type SetupProgressResponse = NonNullable<Schemas["SetupProgressResponse"]>;

export const setupProgressService = {
  getSetupProgress: () =>
    api.get<SetupProgressResponse>("/api/setup-progress").then((res) => res.data),
};
