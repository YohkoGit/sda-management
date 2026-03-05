import { z } from "zod";

export const templateRoleSchema = z.object({
  roleName: z
    .string()
    .min(1, { message: "Le nom du role est requis" })
    .max(100),
  defaultHeadcount: z
    .number()
    .int()
    .min(1, { message: "Minimum 1" })
    .max(99, { message: "Maximum 99" }),
});

export const activityTemplateSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "Le nom du modele est requis" })
      .max(100),
    description: z.string().max(500).optional().or(z.literal("")),
    roles: z
      .array(templateRoleSchema)
      .min(1, { message: "Au moins un role est requis" }),
  })
  .superRefine((data, ctx) => {
    const names = data.roles.map((r) => r.roleName.toLowerCase());
    const seen = new Set<string>();
    for (let i = 0; i < names.length; i++) {
      if (names[i] && seen.has(names[i])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Les noms de roles doivent etre uniques",
          path: ["roles", i, "roleName"],
        });
      }
      if (names[i]) seen.add(names[i]);
    }
  });

export type ActivityTemplateFormData = z.infer<typeof activityTemplateSchema>;
export type TemplateRoleFormData = z.infer<typeof templateRoleSchema>;
