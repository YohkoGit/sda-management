import type { components } from "@/api-generated/schema";

type Schemas = components["schemas"];

export type PublicNextActivity = NonNullable<Schemas["PublicNextActivityResponse"]>;
export type LiveStatus = NonNullable<Schemas["PublicLiveStatusResponse"]>;
export type PublicActivityListItem = NonNullable<Schemas["PublicActivityListItem"]>;
export type PublicDepartment = NonNullable<Schemas["PublicDepartmentResponse"]>;
export type PublicProgramSchedule = NonNullable<Schemas["PublicProgramScheduleResponse"]>;
