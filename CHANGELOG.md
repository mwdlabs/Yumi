# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]

## [0.2.0] - 2026-09-24

Fonctionnalité 1 du MVP : groupe familial.

### Ajouté

- Création d'une famille (nom, échéance hebdomadaire des choix, fuseau de l'appareil).
  Le créateur en devient admin et responsable des courses.
- Invitations par code à 6 chiffres :
  - réutilisable par plusieurs personnes pendant 48 h (`INVITATION_TTL_HOURS`), puis expiré ;
  - révocable ; stocké haché, donc visible seulement à sa création ;
  - aperçu du nom de la famille avant de la rejoindre ;
  - essais de codes limités par utilisateur et par IP.
- Profils : nom, couleur et emoji choisis dans des listes fermées communes à l'API et au
  mobile ; rôles admin / membre ; responsable des courses (plusieurs possibles).
- Profils gérés pour les enfants sans courriel, ajoutés par un admin (ils ne peuvent pas
  être admin).
- Gestion des membres :
  - un membre modifie son profil ;
  - un admin modifie les rôles, retire un membre et règle la famille ;
  - quitter la famille, puis y revenir avec un nouveau code (profil réactivé).
- Règles garanties côté serveur, même en cas de modifications simultanées : au moins un
  admin et au moins un responsable des courses par famille.
- Isolation entre familles : toute ressource d'une famille dont on n'est pas membre
  répond 404.
- Mobile :
  - parcours d'accueil (créer une famille ou rejoindre avec un code) ;
  - onglet Famille (membres avec badges, invitation avec partage du code, réglages) ;
  - écrans de profil et d'ajout d'un enfant ;
  - nouveaux composants (avatar, badges, sélecteurs de couleur, d'emoji, de jour et
    d'heure).
- Tests : 15 tests unitaires des schémas famille, 17 tests d'intégration (droits,
  invitations, règles, isolation entre familles).

### Modifié

- Invitations réutilisables : les colonnes `used_at` / `used_by_user_id` sont remplacées
  par `use_count` ; `members.invitation_id` trace le code utilisé (migration
  `invitation_multi_use`).
- `pnpm --filter @yumi/api prisma:migrate` régénère aussi le client Prisma (Prisma 7 ne le
  fait plus automatiquement).

### Corrigé

- Une modification partielle d'un profil ne réinitialise plus l'emoji.

## [0.1.0] - 2026-09-24

Fondations du projet (étape 0 du MVP).

### Ajouté

- Monorepo pnpm : `apps/api`, `apps/mobile` et `packages/shared`, en TypeScript strict.
- Environnement local `docker-compose` : PostgreSQL 17, Redis 8, et Mailpit pour capturer
  les courriels.
- Schéma de données Prisma complet pour le MVP, avec la migration initiale.
- API : connexion sans mot de passe par code à 6 chiffres envoyé par courriel.
  - Code haché (HMAC), valide 10 minutes, 5 tentatives au maximum, délai entre deux envois.
  - Limitation du nombre de requêtes par adresse courriel et par IP (partagée via Redis).
  - Sessions avec jeton d'accès court (JWT) et refresh token rotatif stocké haché.
  - Déconnexion avec révocation immédiate.
- API : route `GET /v1/me` (profil et familles de l'utilisateur connecté).
- API : validation de la configuration au démarrage, erreurs au format standard, logs
  structurés et arrêt propre.
- Mobile : app Expo SDK 57 (development build) avec Expo Router et navigation protégée
  selon l'état de connexion.
- Mobile : écrans de connexion (adresse courriel, puis code à 6 chiffres avec soumission
  automatique et renvoi du code).
- Mobile : quatre onglets (Semaine, Courses, Recettes, Famille) avec états vides illustrés.
- Mobile : identité visuelle « cuisine chaleureuse » sous forme de design tokens (couleurs
  à contraste vérifié, polices Fraunces et Nunito, icônes Phosphor duotone).
- Mobile : composants de base (bouton, champ, saisie de code, états vide, erreur et
  chargement).
- Mobile : i18n `fr-CA` avec clés typées ; nom, bundle id et scheme configurables par
  variables d'environnement (marque blanche).
- Tests : schémas partagés, configuration et crypto (unitaires), parcours complet
  d'authentification (intégration).
- Outillage : ESLint, Prettier, commitlint (Conventional Commits), README.
