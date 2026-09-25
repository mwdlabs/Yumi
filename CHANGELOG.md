# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]

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
