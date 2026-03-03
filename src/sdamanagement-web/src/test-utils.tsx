import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { AuthProvider } from "@/contexts/AuthContext";

// Create a test i18n instance with inline translations
const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: "fr",
  fallbackLng: "fr",
  ns: ["common"],
  defaultNS: "common",
  interpolation: { escapeValue: false },
  resources: {
    fr: {
      common: {
        auth: {
          login: {
            title: "Connexion",
            email: "Adresse courriel",
            password: "Mot de passe",
            continue: "Continuer",
            submit: "Se connecter",
            back: "Retour",
            or: "Ou",
            googleButton: "Continuer avec Google",
            forgotPassword: "Mot de passe oublié?",
            error: { invalidCredentials: "Identifiants invalides" },
          },
          setPassword: {
            title: "Définir votre mot de passe",
            helper:
              "Ceci est votre première connexion. Veuillez définir un mot de passe sécurisé.",
            newPassword: "Nouveau mot de passe",
            confirmPassword: "Confirmer le mot de passe",
            submit: "Définir le mot de passe",
            success: "Mot de passe défini avec succès. Bienvenue!",
            strength: {
              label: "Exigences du mot de passe",
              minLength: "Minimum 8 caractères",
              uppercase: "Majuscules",
              lowercase: "Minuscules",
              digit: "Chiffres",
            },
          },
          resetPassword: {
            title: "Mot de passe oublié",
            helper:
              "Entrez votre adresse courriel pour réinitialiser votre mot de passe.",
            request: "Réinitialiser le mot de passe",
            confirmTitle: "Nouveau mot de passe",
            confirmHelper: "Entrez votre nouveau mot de passe.",
            confirm: "Confirmer le nouveau mot de passe",
            confirmSuccess:
              "Mot de passe réinitialisé avec succès. Veuillez vous connecter.",
            error: {
              invalidToken:
                "Le lien de réinitialisation est invalide, expiré ou a déjà été utilisé.",
              noToken:
                "Aucun jeton de réinitialisation fourni. Veuillez utiliser le lien envoyé.",
            },
          },
          error: {
            generic: "Une erreur est survenue. Veuillez réessayer.",
          },
        },
      },
    },
  },
});

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={testI18n}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from "@testing-library/react";
export { customRender as render };
