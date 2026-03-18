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
          adminProgramSchedules: "Horaires récurrents",
          adminSystemHealth: "Santé du système",
          adminUsers: "Membres",
          },
          language: {
            switchTo: "Changer en {{lang}}",
            currentLang: "Langue actuelle",
            fr: "Français",
            en: "English",
          },
        },
        pages: {
          home: {
            title: "Accueil",
            subtitle: "Bienvenue à l'Eglise Adventiste du 7e Jour de Saint-Hubert",
            thisSabbath: "Ce Sabbat",
            noActivities: "Aucune activité à venir — revenez bientôt!",
            predicateur: "Prédicateur",
            loadingActivity: "Chargement…",
            loadError: "Impossible de charger les activités",
            welcomeDefault: "Bienvenue",
            liveStreamTitle: "Suivez le culte en direct",
            liveNow: "EN DIRECT",
            watchOnYouTube: "Regarder sur YouTube",
            upcomingActivitiesTitle: "Activités à venir",
            programSchedulesTitle: "Horaire des programmes",
            departmentsTitle: "Nos Départements",
            noPlannedActivity: "Aucune activité planifiée",
            liveStreamDescription: "Rejoignez-nous en direct chaque sabbat",
            specialType: {
              "sainte-cene": "Sainte-Cène",
              "week-of-prayer": "Semaine de prière",
              "camp-meeting": "Camp Meeting",
              "youth-day": "Journée de la jeunesse",
              "family-day": "Journée de la famille",
              "womens-day": "Journée de la femme",
              "evangelism": "Évangélisation",
            },
          },
          dashboard: {
            title: "Tableau de Bord",
            welcome: "Bienvenue, {{name}}",
            commandCenter: "CENTRE DE COMMANDE",
            greeting: "Bonjour, {{name}}",
            personalRegister: "REGISTRE PERSONNEL",
            role: {
              viewer: "Membre",
              admin: "Directeur",
              owner: "Propriétaire",
            },
            upcoming: {
              title: "Activités à Venir",
              overview: "Vue d'ensemble",
              empty: "Aucune activité à venir",
              emptyHintAdmin: "Créez une activité depuis la page d'administration.",
              loadError: "Impossible de charger les activités",
              retry: "Réessayer",
              viewAll: "Voir tout",
            },
            myAssignments: {
              title: "Mes Affectations",
              empty: "Aucune affectation à venir",
              emptyHint: "Les affectations apparaissent ici lorsqu'un administrateur vous assigne un rôle dans une activité.",
              loadError: "Impossible de charger vos affectations",
              retry: "Réessayer",
              coAssignees: "Aussi assigné(s)",
              guest: "Invité",
            },
          },
          calendar: {
            title: "Calendrier",
            loadError: "Impossible de charger le calendrier",
            retry: "Réessayer",
            views: {
              label: "Vue du calendrier",
              day: "Jour",
              week: "Semaine",
              month: "Mois",
              year: "Année",
              dayAbbr: "J",
              weekAbbr: "S",
              monthAbbr: "M",
              yearAbbr: "A",
            },
            filter: {
              all: "Tous",
              label: "Filtrer par département",
            },
            dayDetail: {
              title: "Activités du jour",
              empty: "Aucune activité planifiée",
              create: "Nouvelle activité",
              viewFullDay: "Voir la journée complète",
              backToDay: "Retour",
              pastDate: "Impossible de créer une activité dans le passé",
              departmentError: "Impossible de charger les départements",
            },
          },
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
          adminActivityTemplates: {
            title: "Modèles d'activités",
            emptyState: "Définissez vos modèles d\u2019activités — Sabbat, Sainte-Cène, Réunion...",
            emptyStateHelper: "Les modèles permettent de créer rapidement des activités avec des rôles prédéfinis.",
            createButton: "Créer un modèle",
            form: {
              createTitle: "Nouveau modèle d\u2019activité",
              editTitle: "Modifier le modèle",
              name: "Nom du modèle",
              namePlaceholder: "Culte du Sabbat",
              description: "Description",
              descriptionPlaceholder: "Service principal du samedi...",
              roles: "Rôles par défaut",
              addRole: "Ajouter un rôle",
              roleName: "Nom du rôle",
              roleNamePlaceholder: "Prédicateur",
              headcount: "Effectif",
              save: "Enregistrer",
              saving: "Enregistrement...",
              cancel: "Annuler",
            },
            createSuccess: "Modèle créé avec succès",
            updateSuccess: "Modèle modifié avec succès",
            deleteSuccess: "Modèle supprimé",
            deleteError: "Échec de la suppression du modèle.",
            conflictError: "Un modèle avec ce nom existe déjà.",
            deleteConfirmTitle: "Supprimer le modèle",
            deleteConfirmMessage: "Cette action est irréversible. Les rôles associés seront également supprimés.",
            deleteConfirmAction: "Supprimer",
            card: {
              edit: "Modifier",
              delete: "Supprimer",
              roles: "rôle(s)",
            },
            noAccess: "Accès réservé au propriétaire du système.",
          },
          adminProgramSchedules: {
            title: "Horaires récurrents",
            emptyState: "Configurez vos horaires récurrents — École du Sabbat, Culte Divin, JA...",
            emptyStateHelper: "Les horaires récurrents définissent les programmes hebdomadaires de votre église.",
            createButton: "Créer un horaire",
            form: {
              createTitle: "Nouvel horaire récurrent",
              editTitle: "Modifier l\u2019horaire",
              title: "Titre",
              titlePlaceholder: "Culte Divin",
              dayOfWeek: "Jour de la semaine",
              startTime: "Heure de début",
              endTime: "Heure de fin",
              hostName: "Responsable",
              hostNamePlaceholder: "Pasteur Dupont",
              department: "Département",
              departmentNone: "Aucun",
              save: "Enregistrer",
              saving: "Enregistrement...",
              cancel: "Annuler",
            },
            createSuccess: "Horaire créé avec succès",
            updateSuccess: "Horaire modifié avec succès",
            deleteSuccess: "Horaire supprimé",
            deleteError: "Échec de la suppression de l\u2019horaire.",
            conflictError: "Un horaire avec ce titre et ce jour existe déjà.",
            deleteConfirmTitle: "Supprimer l\u2019horaire",
            deleteConfirmMessage: "Cette action est irréversible.",
            deleteConfirmAction: "Supprimer",
            card: {
              edit: "Modifier",
              delete: "Supprimer",
            },
            noAccess: "Accès réservé au propriétaire du système.",
          },
          adminSystemHealth: {
            title: "Santé du système",
            refreshButton: "Actualiser",
            refreshing: "Actualisation...",
            noAccess: "Accès réservé au propriétaire du système.",
            database: {
              title: "Base de données",
              healthy: "Fonctionnel",
              unhealthy: "Défaillant",
              degraded: "Dégradé",
              duration: "Durée",
            },
            system: {
              title: "Informations système",
              version: "Version",
              uptime: "Temps de fonctionnement",
              environment: "Environnement",
            },
            setup: {
              title: "État de la configuration",
              churchConfig: "Configuration de l'église",
              departments: "Départements",
              templates: "Modèles d'activités",
              schedules: "Horaires récurrents",
              users: "Utilisateurs",
              configured: "Configuré",
              notConfigured: "Non configuré",
            },
            uptime: {
              days_one: "{{count}} jour",
              days_other: "{{count}} jours",
              hours_one: "{{count}} heure",
              hours_other: "{{count}} heures",
              minutes_one: "{{count}} minute",
              minutes_other: "{{count}} minutes",
              lessThanMinute: "Moins d'une minute",
            },
          },
          adminUsers: {
            title: "Gestion des membres",
            createButton: "Ajouter un utilisateur",
            emptyState: "Aucun membre. Ajoutez votre premier membre.",
            loadMore: "Charger plus",
            bulkCreateButton: "Création en lot",
            editButton: "Modifier",
            deleteDialog: {
              title: "Supprimer l'utilisateur",
              description: "Cette action est irréversible. {{name}} ne pourra plus se connecter.",
              confirm: "Supprimer",
            },
            editForm: {
              title: "Modifier l'utilisateur",
              submit: "Enregistrer",
              emailReadonly: "Le courriel ne peut pas être modifié",
              selfRoleDisabled: "Votre rôle ne peut être modifié que par un autre administrateur",
              roleDowngradeWarning: "Cet utilisateur perdra ses privilèges d'administration",
            },
            bulkForm: {
              title: "Création en lot",
              addRow: "Ajouter une ligne",
              removeRow: "Supprimer la ligne",
              rowCount: "{{current}} / {{max}} lignes",
              submit: "Créer tous",
              cancel: "Annuler",
            },
            form: {
              title: "Nouvel utilisateur",
              firstName: "Prénom",
              lastName: "Nom de famille",
              email: "Courriel",
              role: "Rôle",
              departments: "Départements",
              selectDepartments: "Sélectionner des départements",
              submit: "Créer",
              cancel: "Annuler",
            },
            toast: {
              created: "Utilisateur créé",
              updated: "Utilisateur mis à jour",
              deleted: "Utilisateur supprimé",
              bulkCreated: "{{count}} utilisateurs créés",
              avatarUploadSuccess: "Avatar téléversé avec succès",
              avatarUploadError: "Échec du téléversement de l'avatar",
              avatarFileTooLarge: "Le fichier est trop volumineux ou le format est invalide",
              avatarInvalidType: "Le fichier doit être au format JPEG, PNG ou WebP",
              changeAvatar: "Changer l'avatar",
              error: {
                duplicate: "Cet email est déjà utilisé",
                forbidden: "Accès refusé",
                notFound: "Utilisateur introuvable",
                bulkValidation: "Corrigez les erreurs avant de soumettre",
                duplicateInBatch: "Emails en double dans le lot",
                lastOwner: "Impossible de supprimer le dernier propriétaire",
                deleteFailed: "Échec de la suppression",
              },
            },
          },
          activityDetail: {
            back: "Retour",
            edit: "Modifier",
            notFound: "Activité non trouvée",
            notFoundHint: "Cette activité n'existe pas ou a été supprimée.",
            backToDashboard: "Retour au tableau de bord",
            loadError: "Impossible de charger l'activité",
            retry: "Réessayer",
            description: "Description",
            roster: {
              title: "Composition de l'activité",
              noRoles: "Aucun rôle défini pour cette activité",
              unassigned: "Non assigné",
              unassignedPosition: "Position non assignée",
              guest: "(Invité)",
              assigned: "{{assigned}}/{{total}}",
              ariaRoleStatus: "{{role}}: {{assigned}} sur {{total}} assigné(s)",
            },
          },
          adminActivities: {
            title: "Activités",
            createButton: "Nouvelle activité",
            emptyState: "Aucune activité. Créez votre première activité.",
            emptyStateHelper: "Les activités organisent les événements de votre département\u00a0: cultes, réunions, programmes spéciaux.",
            form: {
              createTitle: "Nouvelle activité",
              editTitle: "Modifier l\u2019activité",
              title: "Titre",
              titlePlaceholder: "Culte du Sabbat",
              description: "Description",
              descriptionPlaceholder: "Service principal du samedi...",
              date: "Date",
              startTime: "Heure de début",
              endTime: "Heure de fin",
              department: "Département",
              visibility: "Visibilité",
              visibilityPublic: "Publique",
              visibilityAuthenticated: "Authentifié seulement",
              specialType: "Type spécial",
              specialTypeNone: "Aucun",
              save: "Enregistrer",
              saving: "Enregistrement...",
              cancel: "Annuler",
            },
            specialType: {
              "sainte-cene": "Sainte-Cène",
              "week-of-prayer": "Semaine de prière",
              "camp-meeting": "Camp Meeting",
              "youth-day": "Journée de la jeunesse",
              "family-day": "Journée de la famille",
              "womens-day": "Journée de la femme",
              "evangelism": "Évangélisation",
            },
            toast: {
              created: "Activité publiée",
              updated: "Activité modifiée",
              deleted: "Activité supprimée",
            },
            deleteConfirmTitle: "Supprimer l\u2019activité",
            deleteConfirmMessage: "Êtes-vous sûr de vouloir supprimer cette activité ?",
            deleteConfirmWarning: "Cette action supprimera également tous les rôles et assignations associés.",
            deleteConfirmAction: "Supprimer",
            conflictError: "Cette activité a été modifiée par un autre utilisateur. Rechargez et réessayez.",
            conflict: {
              title: "Conflit de modification",
              description: "Cette activité a été modifiée par un autre administrateur pendant votre session. Vous pouvez recharger les données actuelles ou écraser avec vos modifications.",
              reload: "Recharger les données",
              overwrite: "Écraser avec mes modifications",
              reloaded: "Données rechargées",
              reloadError: "Impossible de recharger les données.",
            },
            assignmentError: "Erreur de validation des assignations. Vérifiez les rôles et réessayez.",
            visibility: {
              public: "Publique",
              authenticated: "Authentifié",
            },
            roleRoster: {
              title: "Rôles de l\u2019activité",
              addRole: "Ajouter un rôle",
              roleNamePlaceholder: "Nom du rôle",
              headcountLabel: "Nombre",
              decreaseHeadcount: "Diminuer le nombre",
              increaseHeadcount: "Augmenter le nombre",
              assignedIndicator: "{{assigned}}/{{total}} assigné(s)",
              removeRole: "Supprimer le rôle",
              removeRoleConfirmTitle: "Supprimer le rôle ?",
              removeRoleConfirmDescription: "Supprimer ce rôle supprimera également {{count}} assignation(s) existante(s). Cette action est irréversible.",
              removeRoleConfirmButton: "Supprimer",
              cancelButton: "Annuler",
              emptyState: "Aucun rôle. Ajoutez des rôles pour définir les postes nécessaires.",
              maxRolesReached: "Maximum 20 rôles atteint.",
              unassigned: "Non assigné",
              tapToAssign: "Appuyer pour assigner",
              editAssignment: "Modifier l\u2019assignation pour {{role}}",
              removeAssignment: "{{name}} — appuyer pour retirer",
              duplicateRoleName: "Les noms de rôle doivent être uniques.",
              roleNameRequired: "Le nom du rôle est requis.",
              roleNameTooLong: "Le nom du rôle ne doit pas dépasser 100 caractères.",
              guestLabel: "(Invité)",
            },
            contactPicker: {
              searchPlaceholder: "Rechercher un membre...",
              noResults: "Aucun membre trouvé.",
              selectionFor: "Sélection pour\u00a0: {{role}}",
              fullyStaffed: "Complet",
              tapToAssign: "Appuyer pour assigner",
              unassigned: "Non assigné",
              emptySystem: "Aucun membre enregistré. Ajoutez des membres dans Administration.",
              frequentlyAssigned: "Fréquemment assignés",
              addGuest: "Ajouter un invité",
              showMore: "Afficher plus...",
              guestName: "Nom complet",
              guestPhone: "Téléphone",
              createGuest: "Créer",
              guestCreating: "Création...",
              guestCreated: "Invité créé",
              guestError: "Échec de création",
              guestBack: "Retour à la recherche",
            },
            templateSelector: {
              title: "Choisir un modèle",
              subtitle: "Sélectionnez un modèle pour pré-remplir les rôles, ou créez une activité personnalisée.",
              customCard: "Activité sans modèle",
              customDescription: "Commencez avec une activité vide, sans rôles prédéfinis.",
              rolesLabel: "Rôles du modèle",
              rolesCaption: "Ces rôles seront créés automatiquement avec l\u2019activité.",
              backToTemplates: "Retour aux modèles",
              emptyState: "Aucun modèle disponible.",
              emptyStateOwner: "Créez des modèles d\u2019activités dans les paramètres pour accélérer la création.",
              emptyStateAdmin: "Contactez l\u2019administrateur pour créer des modèles.",
              errorState: "Impossible de charger les modèles.",
              retry: "Réessayer",
              noDefaultRoles: "Aucun rôle par défaut",
              templateError: "Le modèle sélectionné est introuvable.",
            },
            staffing: {
              fullyStaffed: "Complet",
              partiallyStaffed: "{{assigned}}/{{total}}",
              criticalGap: "Critique",
              noRoles: "Aucun rôle",
              count: "{{assigned}}/{{total}}",
              filled: "{{assigned}}/{{total}} postes pourvus",
              ariaLabel: "Effectif\u00a0: {{assigned}} sur {{total}} postes pourvus",
              ariaLabelCritical: "Effectif\u00a0: {{assigned}} sur {{total}} postes pourvus, lacune critique",
              ariaLabelNoRoles: "Aucun rôle défini",
              column: "Effectif",
            },
            roster: {
              title: "Composition de l\u2019activité",
              unassigned: "Non assigné",
              guest: "(Invité)",
              noRoles: "Aucun rôle",
              moreUnassigned: "+{{count}} de plus",
            },
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
        setup: {
          title: "Configuration initiale",
          ariaLabel: "Configuration initiale",
          startHere: "Commencez ici",
          steps: {
            churchSettings: "Paramètres",
            departments: "Départements",
            templates: "Modèles d\u2019activités",
            schedules: "Horaires récurrents",
            members: "Membres",
          },
          complete: "Configuration terminée \u2014 votre système est prêt!",
        },
        common: {
          cancel: "Annuler",
          back: "Retour",
        },
        days: {
          "0": "Dimanche",
          "1": "Lundi",
          "2": "Mardi",
          "3": "Mercredi",
          "4": "Jeudi",
          "5": "Vendredi",
          "6": "Samedi",
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
        pages: {
          home: {
            thisSabbath: "This Sabbath",
          },
          dashboard: {
            title: "Dashboard",
            welcome: "Welcome, {{name}}",
            commandCenter: "COMMAND CENTER",
            greeting: "Hello, {{name}}",
            personalRegister: "PERSONAL REGISTER",
            role: {
              viewer: "Member",
              admin: "Director",
              owner: "Owner",
            },
            upcoming: {
              title: "Upcoming Activities",
              overview: "Overview",
              empty: "No upcoming activities",
              emptyHintAdmin: "Create an activity from the admin page.",
              loadError: "Failed to load activities",
              retry: "Retry",
              viewAll: "View all",
            },
            myAssignments: {
              title: "My Assignments",
              empty: "No upcoming assignments",
              emptyHint: "Assignments appear here when an administrator assigns you a role in an activity.",
              loadError: "Failed to load your assignments",
              retry: "Retry",
              coAssignees: "Also assigned",
              guest: "Guest",
            },
          },
          calendar: {
            title: "Calendar",
            loadError: "Unable to load calendar",
            retry: "Retry",
            views: {
              label: "Calendar view",
              day: "Day",
              week: "Week",
              month: "Month",
              year: "Year",
              dayAbbr: "D",
              weekAbbr: "W",
              monthAbbr: "M",
              yearAbbr: "Y",
            },
            filter: {
              all: "All",
              label: "Filter by department",
            },
            dayDetail: {
              title: "Day activities",
              empty: "No activities planned",
              create: "New activity",
              viewFullDay: "View full day",
              backToDay: "Back",
              pastDate: "Cannot create activity in the past",
              departmentError: "Unable to load departments",
            },
          },
          activityDetail: {
            back: "Back",
            edit: "Edit",
            notFound: "Activity not found",
            notFoundHint: "This activity doesn't exist or has been deleted.",
            backToDashboard: "Back to dashboard",
            loadError: "Failed to load activity",
            retry: "Retry",
            description: "Description",
            roster: {
              title: "Activity Roster",
              noRoles: "No roles defined for this activity",
              unassigned: "Unassigned",
              unassignedPosition: "Unassigned position",
              guest: "(Guest)",
              assigned: "{{assigned}}/{{total}}",
              ariaRoleStatus: "{{role}}: {{assigned}} of {{total}} assigned",
            },
          },
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
