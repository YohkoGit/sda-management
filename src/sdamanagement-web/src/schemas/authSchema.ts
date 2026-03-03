import { z } from "zod";

export const emailSchema = z.object({
  email: z.email({ error: "Format d'email invalide" }),
});

export const loginSchema = z.object({
  email: z.email({ error: "Format d'email invalide" }),
  password: z.string().min(8, { error: "Le mot de passe doit contenir au moins 8 caractères" }),
});

export const setPasswordSchema = z
  .object({
    email: z.email({ error: "Format d'email invalide" }),
    newPassword: z
      .string()
      .min(8, { error: "Le mot de passe doit contenir au moins 8 caractères" })
      .regex(/[A-Z]/, { error: "Le mot de passe doit contenir au moins une majuscule" })
      .regex(/[a-z]/, { error: "Le mot de passe doit contenir au moins une minuscule" })
      .regex(/[0-9]/, { error: "Le mot de passe doit contenir au moins un chiffre" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z
      .string()
      .min(8, { error: "Le mot de passe doit contenir au moins 8 caractères" })
      .regex(/[A-Z]/, { error: "Le mot de passe doit contenir au moins une majuscule" })
      .regex(/[a-z]/, { error: "Le mot de passe doit contenir au moins une minuscule" })
      .regex(/[0-9]/, { error: "Le mot de passe doit contenir au moins un chiffre" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type EmailFormData = z.infer<typeof emailSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type SetPasswordFormData = z.infer<typeof setPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
