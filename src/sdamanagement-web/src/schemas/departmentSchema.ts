import { z } from "zod";

export const departmentSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Le nom du departement est requis" })
    .max(100),
  abbreviation: z
    .string()
    .max(10)
    .regex(/^[A-Za-z0-9]*$/, { message: "Lettres et chiffres seulement" })
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .min(1, { message: "La couleur est requise" })
    .regex(/^#[0-9A-Fa-f]{6}$/, {
      message: "Format hexadecimal requis (ex: #4F46E5)",
    }),
  description: z.string().max(500).optional().or(z.literal("")),
  subMinistryNames: z.array(z.string().min(1).max(100)).optional(),
});

export const subMinistrySchema = z.object({
  name: z
    .string()
    .min(1, { message: "Le nom du sous-ministere est requis" })
    .max(100),
  leadUserId: z.number().int().positive().nullable().optional(),
});

export type DepartmentFormData = z.infer<typeof departmentSchema>;
export type SubMinistryFormData = z.infer<typeof subMinistrySchema>;
