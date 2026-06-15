/**
 * Zod-Validierungsschemas für alle Formulare.
 *
 * Werden sowohl Client-seitig (Formular-Feedback)
 * als auch Server-seitig (Server Actions) verwendet.
 */

import { z } from "zod";
import {
  LOCATION_NAME_MAX,
  LOCATION_DESC_MAX,
  ITEM_NAME_MAX,
  ITEM_DESC_MAX,
  ITEM_QUANTITY_MAX,
  DISPLAY_NAME_MAX,
  PASSWORD_MIN_LENGTH,
} from "@/lib/constants";

// ---- Auth -------------------------------------------------

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-Mail ist erforderlich.")
    .email("Keine gültige E-Mail-Adresse."),
  password: z
    .string()
    .min(1, "Passwort ist erforderlich."),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "E-Mail ist erforderlich.")
      .email("Keine gültige E-Mail-Adresse."),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`),
    passwordConfirm: z
      .string()
      .min(1, "Bitte Passwort bestätigen."),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Passwörter stimmen nicht überein.",
    path: ["passwordConfirm"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "E-Mail ist erforderlich.")
    .email("Keine gültige E-Mail-Adresse."),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`),
    passwordConfirm: z
      .string()
      .min(1, "Bitte Passwort bestätigen."),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Passwörter stimmen nicht überein.",
    path: ["passwordConfirm"],
  });

export const changePasswordSchema = resetPasswordSchema;

// ---- Profil -----------------------------------------------

export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .max(DISPLAY_NAME_MAX, `Maximal ${DISPLAY_NAME_MAX} Zeichen.`)
    .optional(),
});

// ---- Locations --------------------------------------------

export const locationSchema = z.object({
  name: z
    .string()
    .min(1, "Name ist erforderlich.")
    .max(LOCATION_NAME_MAX, `Maximal ${LOCATION_NAME_MAX} Zeichen.`)
    .transform((v) => v.trim()),
  description: z
    .string()
    .max(LOCATION_DESC_MAX, `Maximal ${LOCATION_DESC_MAX} Zeichen.`)
    .optional()
    .transform((v) => v?.trim() || undefined),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Ungültiger Farbwert.")
    .optional(),
});

export type LocationFormData = z.infer<typeof locationSchema>;

// ---- Items ------------------------------------------------

export const itemSchema = z.object({
  name: z
    .string()
    .min(1, "Name ist erforderlich.")
    .max(ITEM_NAME_MAX, `Maximal ${ITEM_NAME_MAX} Zeichen.`)
    .transform((v) => v.trim()),
  description: z
    .string()
    .max(ITEM_DESC_MAX, `Maximal ${ITEM_DESC_MAX} Zeichen.`)
    .optional()
    .transform((v) => v?.trim() || undefined),
  quantity: z
    .number()
    .int("Muss eine ganze Zahl sein.")
    .min(0, "Mindestens 0.")
    .max(ITEM_QUANTITY_MAX, `Maximal ${ITEM_QUANTITY_MAX}.`),
  location_id: z
    .string()
    .uuid("Ungültiger Ablageort."),
});

export type ItemFormData = z.infer<typeof itemSchema>;

// ---- Suche ------------------------------------------------

export const searchSchema = z.object({
  query: z
    .string()
    .min(2, "Mindestens 2 Zeichen eingeben.") // SEARCH_MIN_LENGTH
    .max(100, "Suchanfrage zu lang."),
});
