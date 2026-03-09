import { z } from "zod";

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
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "L'heure de fin doit etre apres l'heure de debut",
    path: ["endTime"],
  });

export const updateActivitySchema = createActivitySchema.and(
  z.object({
    concurrencyToken: z.number(),
  })
);

export type CreateActivityFormData = z.infer<typeof createActivitySchema>;
export type UpdateActivityFormData = z.infer<typeof updateActivitySchema>;
