# Yumi

Application mobile de coordination familiale des repas et des courses : qui cuisine quoi,
quel jour, et génération automatique d'une liste de courses fusionnée à partir des recettes
choisies.

Produit développé par **MWD Labs**. Le nom, les identifiants et le scheme de l'app sont
configurables (marque blanche) : voir [Configuration](#configuration).

## Sommaire

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Lancement en local](#lancement-en-local)
- [Tests et qualité](#tests-et-qualité)
- [Structure du projet](#structure-du-projet)
- [Configuration](#configuration)
- [Conventions](#conventions)
- [Dépannage](#dépannage)

## Prérequis

| Outil          | Version | Notes                                                                             |
| -------------- | ------- | --------------------------------------------------------------------------------- |
| Node.js        | 24 LTS  | `.nvmrc` fourni (`fnm use` / `nvm use`)                                           |
| pnpm           | 10      | Activé via `corepack enable` (version fixée dans `package.json`)                  |
| Docker         | récent  | PostgreSQL, Redis et Mailpit en local                                             |
| Xcode          | récent  | Uniquement pour compiler l'app iOS en local (sinon : EAS Build dans le nuage)     |
| Android Studio | récent  | Uniquement pour compiler l'app Android en local (sinon : EAS Build dans le nuage) |

L'app mobile utilise un **development build** Expo (et non Expo Go), car elle embarque des
modules natifs (notifications, stockage sécurisé).

## Installation

```bash
corepack enable
pnpm install                     # installe tout le monorepo et génère le client Prisma

cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Dans `apps/api/.env`, remplacer `HASH_SECRET` et `JWT_ACCESS_SECRET` par des valeurs
aléatoires : `openssl rand -base64 48`.

## Lancement en local

```bash
# 1. Services : PostgreSQL (5432), Redis (6379), Mailpit (1025 / interface 8025)
pnpm db:up

# 2. Schéma de base de données
pnpm --filter @yumi/api prisma:migrate

# 3. API (http://localhost:3000, rechargement automatique)
pnpm dev:api

# 4. App mobile : compiler et installer le development build (une seule fois,
#    puis à chaque ajout de module natif)…
pnpm --filter @yumi/mobile ios        # ou : android
#    …ou via EAS dans le nuage (sans Xcode / Android Studio) :
#    cd apps/mobile && npx eas-cli build --profile development --platform ios

# 5. Serveur de développement JS (à relancer ensuite au quotidien)
pnpm dev:mobile
```

**Connexion :** saisir une adresse courriel dans l'app. En local, aucun courriel réel n'est
envoyé : le code à 6 chiffres est visible dans Mailpit, sur <http://localhost:8025>.

## Tests et qualité

```bash
pnpm test                                  # tests unitaires (shared + api)
pnpm --filter @yumi/api test:integration   # tests d'intégration de l'API (requiert pnpm db:up)
pnpm typecheck                             # TypeScript strict, tous les paquets
pnpm lint                                  # ESLint
pnpm format                                # Prettier
pnpm --filter @yumi/mobile doctor          # diagnostic Expo (compatibilité des dépendances)
```

Les tests d'intégration utilisent une base dédiée, `yumi_test`, créée automatiquement au
premier démarrage du conteneur PostgreSQL. Ses tables sont vidées avant chaque test.

## Structure du projet

```
yumi/
├─ apps/
│  ├─ api/                  API REST (Express 5, Prisma 7, PostgreSQL)
│  │  ├─ prisma/            schema.prisma et migrations
│  │  ├─ src/
│  │  │  ├─ config/         lecture et validation des variables d'environnement (Zod)
│  │  │  ├─ http/           gestion des erreurs, middlewares (auth, rate-limit)
│  │  │  ├─ modules/        un dossier par domaine métier (router + service)
│  │  │  ├─ mail/           abstraction d'envoi de courriel + gabarits
│  │  │  ├─ i18n/           textes des courriels et notifications
│  │  │  ├─ lib/            Prisma, logger, crypto, horloge
│  │  │  ├─ app.ts          assemblage de l'application (dépendances injectées)
│  │  │  └─ server.ts       point d'entrée HTTP
│  │  └─ test/              tests d'intégration (Supertest)
│  └─ mobile/               app React Native (Expo SDK 57, Expo Router)
│     ├─ app.config.ts      configuration native pilotée par l'environnement
│     └─ src/
│        ├─ app/            écrans (routage par fichiers)
│        ├─ features/       logique par domaine (auth, …)
│        ├─ ui/             composants réutilisables du design system
│        ├─ theme/          design tokens (couleurs, typo, espacements, rayons)
│        ├─ i18n/           traductions (fr-CA), clés typées
│        └─ lib/            client API, stockage sécurisé, erreurs
├─ packages/
│  └─ shared/               schémas Zod, types et logique métier partagés API ↔ mobile
├─ docker/                  scripts d'initialisation des conteneurs
└─ docker-compose.yml
```

Le paquet `@yumi/shared` est consommé directement en TypeScript : par Metro côté mobile,
et par `tsx` puis le bundle `tsdown` côté API. Il n'a donc pas d'étape de build.

## Configuration

Toute la configuration passe par des variables d'environnement. Chaque app a son
`.env.example`, documenté ligne par ligne.

**Marque blanche (mobile)** : `APP_NAME`, `APP_SLUG`, `APP_SCHEME`, `IOS_BUNDLE_ID` et
`ANDROID_PACKAGE` sont lus au build par `app.config.ts`. Le nom affiché dans l'interface
provient de la même source (`{{appName}}` dans les traductions). Côté API, `APP_NAME` alimente
les courriels et les notifications.

**Version** : une seule version produit, dans le `package.json` racine, que l'app mobile
reprend automatiquement.

## Conventions

- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/fr/) (`feat:`,
  `fix:`, `chore:`…), vérifiés par commitlint au moment du commit.
- **Versions** : [SemVer](https://semver.org/lang/fr/). Chaque changement notable est ajouté
  au fur et à mesure dans la section « Non publié » du [CHANGELOG](CHANGELOG.md).
- **Textes** : aucun texte en dur dans l'interface ; tout passe par i18n (`src/i18n/locales`).
- **Style** : aucune couleur, taille ou espacement en dur ; tout passe par `src/theme/tokens.ts`.
- **Heures** : les instants sont stockés en UTC. Les règles récurrentes (rappels, échéances)
  sont stockées en heure locale, avec le fuseau IANA de la famille.

## Dépannage

**L'app sur un appareil physique n'atteint pas l'API.** `localhost` désigne alors le
téléphone lui-même. Créer `apps/mobile/.env.local` avec l'adresse IP de l'ordinateur sur le
réseau local, par exemple `EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/v1`, puis
recharger l'app.

**`Configuration invalide` au démarrage de l'API.** Le message liste les variables
manquantes ou invalides de `apps/api/.env`.
