import { z } from "zod";

export const churchConfigSchema = z.object({
  churchName: z
    .string()
    .min(1, { error: "Le nom de l'eglise est requis" })
    .max(150),
  address: z
    .string()
    .min(1, { error: "L'adresse est requise" })
    .max(300),
  youTubeChannelUrl: z
    .url({ error: "L'URL YouTube doit etre valide" })
    .optional()
    .or(z.literal("")),
  phoneNumber: z.string().max(30).optional().or(z.literal("")),
  welcomeMessage: z.string().max(1000).optional().or(z.literal("")),
  defaultLocale: z.enum(["fr", "en"]),
});

export type ChurchConfigFormData = z.infer<typeof churchConfigSchema>;
