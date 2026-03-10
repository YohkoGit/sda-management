import { z } from "zod";

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

export const createActivitySchema = z
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
    templateId: z.number().int().positive().optional(),
    roles: z.array(activityRoleInputSchema).max(20).optional(),
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
  );

export const updateActivitySchema = createActivitySchema.and(
  z.object({
    concurrencyToken: z.number(),
  })
);

export type CreateActivityFormData = z.infer<typeof createActivitySchema>;
export type UpdateActivityFormData = z.infer<typeof updateActivitySchema>;
