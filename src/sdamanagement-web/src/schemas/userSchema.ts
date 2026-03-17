import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z
    .string()
    .min(1, { message: "Le prénom est requis" })
    .max(100),
  lastName: z
    .string()
    .min(1, { message: "Le nom de famille est requis" })
    .max(100),
  email: z
    .string()
    .min(1, { message: "Le courriel est requis" })
    .email({ message: "Courriel invalide" })
    .max(255),
  role: z.enum(["Viewer", "Admin", "Owner"], {
    error: () => "Sélectionnez un rôle",
  }),
  departmentIds: z
    .array(z.number())
    .min(1, { message: "Sélectionnez au moins un département" }),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.omit({ email: true });

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;

export const bulkCreateUsersSchema = z.object({
  users: z.array(createUserSchema).min(1).max(30),
}).refine(
  (data) => {
    const emails = data.users.map((u) => u.email.toLowerCase());
    return new Set(emails).size === emails.length;
  },
  { message: "Duplicate emails in batch", path: ["users"] }
);

export type BulkCreateUsersFormData = z.infer<typeof bulkCreateUsersSchema>;
