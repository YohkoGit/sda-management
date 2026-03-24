import { z } from "zod";

export const SPECIAL_TYPES = [
  "sainte-cene",
  "week-of-prayer",
  "camp-meeting",
  "youth-day",
  "family-day",
  "womens-day",
  "evangelism",
] as const;

export const roleAssignmentInputSchema = z.object({
  userId: z.number().int().positive(),
});

export const activityRoleInputSchema = z.object({
  // useFieldArray injects a string `id` for React keys; catch(undefined) silently discards it
  id: z.number().int().positive().optional().catch(undefined),
  roleName: z.string().min(1).max(100),
  headcount: z.number().int().min(1).max(99),
  assignments: z.array(roleAssignmentInputSchema).optional(),
});

export type ActivityRoleInputData = z.infer<typeof activityRoleInputSchema>;

/** Base activity fields and refinements shared by create and update schemas. */
const baseActivitySchema = z
  .object({
    title: z
      .string()
      .min(1, { message: "Le titre est requis" })
      .max(150),
    description: z.string().max(1000).optional().or(z.literal("")),
    date: z
      .string()
      .min(1, { message: "La date est requise" })
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Format de date invalide" }),
    startTime: z.string().min(1, { message: "L'heure de debut est requise" }),
    endTime: z.string().min(1, { message: "L'heure de fin est requise" }),
    departmentId: z.number().int().positive({ message: "Le departement est requis" }),
    visibility: z.enum(["public", "authenticated"]),
    specialType: z.enum(SPECIAL_TYPES).nullable().optional(),
    templateId: z.number().int().positive().optional(),
    roles: z.array(activityRoleInputSchema).max(20).optional(),
    isMeeting: z.boolean().optional(),
    meetingType: z.enum(["zoom", "physical"]).optional(),
    zoomLink: z.string().url().max(500).optional().or(z.literal("")),
    locationName: z.string().max(150).optional().or(z.literal("")),
    locationAddress: z.string().max(300).optional().or(z.literal("")),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "L'heure de fin doit etre apres l'heure de debut",
    path: ["endTime"],
  })
  .refine(
    (data) => {
      if (!data.roles) return true;
      const names = data.roles.map((r) => r.roleName.trim().toLowerCase());
      return new Set(names).size === names.length;
    },
    { message: "Les noms de rôle doivent être uniques.", path: ["roles"] }
  )
  .superRefine((data, ctx) => {
    if (!data.isMeeting) return;

    if (!data.meetingType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meetingType"],
        message: "Le type de réunion est requis",
      });
      return;
    }

    if (data.meetingType === "zoom" && !data.zoomLink) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["zoomLink"],
        message: "Le lien Zoom est requis",
      });
    }

    if (data.meetingType === "physical" && !data.locationName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["locationName"],
        message: "Le nom du lieu est requis",
      });
    }
  });

export { baseActivitySchema };

export const createActivitySchema = baseActivitySchema.refine(
  (data) => {
    const today = new Date().toISOString().slice(0, 10);
    return data.date >= today;
  },
  {
    message: "La date doit être aujourd'hui ou dans le futur",
    path: ["date"],
  }
);

export const updateActivitySchema = baseActivitySchema.and(
  z.object({
    concurrencyToken: z.number(),
  })
);

export type CreateActivityFormData = z.infer<typeof createActivitySchema>;
export type UpdateActivityFormData = z.infer<typeof updateActivitySchema>;
