import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
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
        app: {
          title: "SDAC ST-HUBERT — Commandement des Opérations",
          churchName: "Eglise Adventiste du 7e Jour de Saint-Hubert",
          churchInitials: "SD",
        },
        nav: {
          public: {
            home: "Accueil",
            calendar: "Calendrier",
            departments: "Départements",
            live: "En Direct",
            signIn: "Connexion",
            menu: "Menu",
          },
          auth: {
            navigation: "Navigation",
            dashboard: "Tableau de Bord",
            calendar: "Calendrier",
            departments: "Départements",
            admin: "Administration",
            settings: "Paramètres",
            signOut: "Terminer la Session",
          },
          language: {
            switchTo: "Changer en {{lang}}",
            currentLang: "Langue actuelle",
            fr: "Français",
            en: "English",
          },
        },
        pages: {
          home: { title: "Accueil", subtitle: "Bienvenue à l'Eglise Adventiste du 7e Jour de Saint-Hubert" },
          dashboard: { title: "Tableau de Bord", welcome: "Bienvenue, {{name}}" },
          calendar: { title: "Calendrier" },
          departments: { title: "Départements" },
          live: { title: "En Direct" },
          admin: { title: "Administration" },
          settings: {
            title: "Paramètres",
            churchIdentity: {
              title: "Identité de l'église",
              emptyState: "Configurez l'identité de votre église",
              emptyStateHelper: "Ces informations apparaîtront sur la page publique de votre église.",
              churchName: "Nom de l'église",
              churchNamePlaceholder: "Eglise Adventiste du 7e Jour de Saint-Hubert",
              address: "Adresse",
              addressPlaceholder: "1234 Rue de l'Eglise, Saint-Hubert, QC",
              youtubeChannelUrl: "URL de la chaîne YouTube",
              youtubeChannelUrlPlaceholder: "https://www.youtube.com/@votre-chaine",
              phoneNumber: "Numéro de téléphone",
              phoneNumberPlaceholder: "+1 (450) 555-0100",
              welcomeMessage: "Message de bienvenue",
              welcomeMessagePlaceholder: "Bienvenue à l'Eglise Adventiste de Saint-Hubert...",
              defaultLocale: "Langue par défaut",
              localeFr: "Français",
              localeEn: "English",
              save: "Sauvegarder",
              saveSuccess: "Paramètres de l'église sauvegardés avec succès",
              saveError: "Erreur lors de la sauvegarde des paramètres",
            },
            noSettingsForRole: "Aucun paramètre disponible pour votre rôle.",
          },
          adminDepartments: {
            title: "Gestion des départements",
            emptyState: "Créez vos départements — ils structurent toute l'application",
            emptyStateHelper: "Les départements organisent les activités, les membres et les responsabilités.",
            createButton: "Créer un département",
            form: {
              createTitle: "Nouveau département",
              editTitle: "Modifier le département",
              name: "Nom du département",
              namePlaceholder: "Jeunesse Adventiste",
              abbreviation: "Abréviation",
              abbreviationPlaceholder: "JA",
              abbreviationHint: "Si vide, le nom en majuscules sera utilisé.",
              color: "Couleur",
              colorPlaceholder: "#4F46E5",
              description: "Description",
              descriptionPlaceholder: "Activités et programmes pour la jeunesse...",
              subMinistries: "Sous-ministères",
              addSubMinistry: "Ajouter un sous-ministère",
              subMinistryPlaceholder: "Éclaireurs",
              save: "Enregistrer",
              saving: "Enregistrement...",
              cancel: "Annuler",
            },
            createSuccess: "Département créé avec succès",
            updateSuccess: "Département modifié avec succès",
            deleteSuccess: "Département supprimé",
            deleteError: "Échec de la suppression du département.",
            deleteConfirmTitle: "Supprimer le département",
            deleteConfirmMessage: "Cette action est irréversible. Les sous-ministères associés seront également supprimés.",
            deleteConfirmAction: "Supprimer",
            conflictError: "Un département avec cette abréviation ou couleur existe déjà.",
            subMinistry: {
              addSuccess: "Sous-ministère ajouté",
              updateSuccess: "Sous-ministère modifié",
              deleteSuccess: "Sous-ministère supprimé",
              deleteError: "Échec de la suppression du sous-ministère.",
            },
            card: {
              subMinistries: "sous-ministère(s)",
              edit: "Modifier",
              delete: "Supprimer",
            },
            noAccess: "Accès réservé au propriétaire du système.",
          },
          notFound: { title: "Page introuvable", message: "La page que vous recherchez n'existe pas.", backHome: "Retour à l'accueil" },
        },
        layout: {
          skipToContent: "Aller au contenu principal",
          loading: "Chargement...",
          churchName: "SDAC Saint-Hubert",
        },
        roles: {
          owner: "Propriétaire",
          admin: "Administrateur",
          viewer: "Membre",
        },
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
            helper: "Ceci est votre première connexion. Veuillez définir un mot de passe sécurisé.",
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
            helper: "Entrez votre adresse courriel pour réinitialiser votre mot de passe.",
            request: "Réinitialiser le mot de passe",
            confirmTitle: "Nouveau mot de passe",
            confirmHelper: "Entrez votre nouveau mot de passe.",
            confirm: "Confirmer le nouveau mot de passe",
            confirmSuccess: "Mot de passe réinitialisé avec succès. Veuillez vous connecter.",
            error: {
              invalidToken: "Le lien de réinitialisation est invalide, expiré ou a déjà été utilisé.",
              noToken: "Aucun jeton de réinitialisation fourni. Veuillez utiliser le lien envoyé.",
            },
          },
          error: {
            generic: "Une erreur est survenue. Veuillez réessayer.",
          },
        },
      },
    },
    en: {
      common: {
        nav: {
          public: {
            home: "Home",
            calendar: "Calendar",
            departments: "Departments",
            live: "Live",
            signIn: "Sign In",
          },
          auth: {
            dashboard: "Dashboard",
            calendar: "Calendar",
            departments: "Departments",
            admin: "Administration",
            settings: "Settings",
            signOut: "Sign Out",
          },
          language: {
            switchTo: "Switch to {{lang}}",
          },
        },
        layout: {
          churchName: "SDAC Saint-Hubert",
          loading: "Loading...",
          skipToContent: "Skip to main content",
        },
        roles: {
          owner: "Owner",
          admin: "Administrator",
          viewer: "Member",
        },
      },
    },
  },
});

export { testI18n };

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  routerProps?: MemoryRouterProps;
}

/**
 * Default wrapper uses BrowserRouter (backward compatible with pre-existing tests).
 * Pass routerProps to use MemoryRouter instead (for controlled route testing).
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={testI18n}>
      <QueryClientProvider client={createTestQueryClient()}>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>{children}</AuthProvider>
          </BrowserRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const { routerProps, ...renderOptions } = options ?? {};

  if (routerProps) {
    const CustomWrapper = ({ children }: { children: React.ReactNode }) => (
      <I18nextProvider i18n={testI18n}>
        <QueryClientProvider client={createTestQueryClient()}>
          <TooltipProvider>
            <MemoryRouter {...routerProps}>
              <AuthProvider>{children}</AuthProvider>
            </MemoryRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </I18nextProvider>
    );
    return render(ui, { wrapper: CustomWrapper, ...renderOptions });
  }

  return render(ui, { wrapper: AllProviders, ...renderOptions });
}

export * from "@testing-library/react";
export { customRender as render };
