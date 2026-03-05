import { z } from "zod";

export const programScheduleSchema = z
  .object({
    title: z
      .string()
      .min(1, { message: "Le titre est requis" })
      .max(100),
    dayOfWeek: z
      .number()
      .int()
      .min(0, { message: "Jour invalide" })
      .max(6, { message: "Jour invalide" }),
    startTime: z
      .string()
      .min(1, { message: "L'heure de debut est requise" })
      .regex(/^\d{2}:\d{2}$/, { message: "Format HH:mm requis" }),
    endTime: z
      .string()
      .min(1, { message: "L'heure de fin est requise" })
      .regex(/^\d{2}:\d{2}$/, { message: "Format HH:mm requis" }),
    hostName: z.string().max(100).optional().or(z.literal("")),
    departmentId: z.number().int().positive().optional().nullable(),
  })
  .refine(
    (data) => {
      if (!data.startTime || !data.endTime) return true;
      return data.endTime > data.startTime;
    },
    {
      message: "L'heure de fin doit etre apres l'heure de debut",
      path: ["endTime"],
    }
  );

export type ProgramScheduleFormData = z.infer<typeof programScheduleSchema>;
