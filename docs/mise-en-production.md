# Mise en production

Ce guide couvre la première publication sur l'App Store (iOS) puis les mises à jour. Les
étapes marquées 🧑 se font à la main, dans un navigateur ou un terminal connecté à tes
comptes ; tout le reste est déjà configuré dans le dépôt.

## Sommaire

- [Versionnage](#versionnage)
- [1. API en production](#1-api-en-production)
- [2. Projet EAS](#2-projet-eas)
- [3. App Store Connect](#3-app-store-connect)
- [4. Build et envoi](#4-build-et-envoi)
- [Mises à jour suivantes](#mises-à-jour-suivantes)
- [Liste de vérification avant envoi](#liste-de-vérification-avant-envoi)

## Versionnage

Deux numéros distincts :

| Numéro                  | Exemple | Source                                                             |
| ----------------------- | ------- | ------------------------------------------------------------------ |
| **Version** (SemVer)    | `1.0.0` | `package.json` racine, reprise par `app.config.ts`                 |
| **Numéro de build** iOS | `14`    | Géré par EAS (`appVersionSource: remote`), +1 à chaque build prod. |
| **versionCode** Android | `14`    | Idem                                                               |

Publier une version :

```bash
# 1. Les changements sont listés dans « Non publié » du CHANGELOG, l'arbre est propre.
pnpm release minor            # ou patch | major | 1.0.0
# → met la version dans tous les package.json, date la section du CHANGELOG,
#   crée le commit « chore(release): x.y.z » et l'étiquette vx.y.z.
git push --follow-tags
```

Chaque version envoyée à Apple doit être **supérieure** à la précédente déjà publiée ; les
builds d'une même version sont départagés par le numéro de build.

## 1. API en production

L'app de production refuse de se construire sans une URL d'API **https** publique.

L'API est hébergée sur le Droplet DigitalOcean qui héberge déjà n8n : suivre
[`deploy/README.md`](../deploy/README.md) (installation, déploiement en une commande avec
`pnpm deploy:api`, sauvegardes, retour arrière).

1. Rappel des variables de production :

   | Variable                                      | Production                                          |
   | --------------------------------------------- | --------------------------------------------------- |
   | `NODE_ENV`                                    | `production`                                        |
   | `DATABASE_URL`, `REDIS_URL`                   | Fixées par `deploy/compose.yml`                     |
   | `HASH_SECRET`, `JWT_ACCESS_SECRET`            | `openssl rand -base64 48`, **différentes** du local |
   | `TRUST_PROXY`                                 | `1` (derrière Caddy), fixé par `deploy/compose.yml` |
   | `ENABLE_DEV_TOOLS`                            | `false` (refusé au démarrage sinon)                 |
   | `SMTP_*`, `MAIL_FROM`                         | Fournisseur réel (Postmark, Resend, SES…)           |
   | `REVIEW_ACCOUNT_EMAIL`, `REVIEW_ACCOUNT_CODE` | Compte de démonstration pour Apple (voir § 3)       |

2. 🧑 Configurer SPF / DKIM / DMARC sur le domaine d'envoi : sans cela, les codes de
   connexion finissent en indésirables.
3. 🧑 Passer le Droplet à 4 Go de RAM avant le lancement public.

## 2. Projet EAS ✅

Projet **`@mwdlabs/yumi`** (ID `5c56bd7f-1a20-43c0-9b03-4f3faca89bbb`), déjà configuré :

| Réglage               | Où                                         |
| --------------------- | ------------------------------------------ |
| Compte et projet Expo | Valeurs par défaut de `app.config.ts`      |
| `EXPO_PUBLIC_API_URL` | `eas.json`, profil `production`            |
| `IOS_BUNDLE_ID`       | `ca.mwdlabs.yumi` (ne plus jamais changer) |

Rien à saisir sur expo.dev. Pour une marque blanche, surcharger `EXPO_OWNER` et
`EAS_PROJECT_ID` (voir `apps/mobile/.env.example`).

## 3. App Store Connect

1. 🧑 Compte Apple Developer actif (99 $ US/an).
2. 🧑 App Store Connect → Apps → **+** : nom, langue principale Français (Canada), bundle
   ID `ca.mwdlabs.yumi`, SKU (ex. `yumi-ios`).
3. 🧑 Fiche de l'app :
   - **URL de la politique de confidentialité** (obligatoire) : publier
     [`politique-de-confidentialite.md`](politique-de-confidentialite.md) une fois complétée ;
   - **URL d'assistance** (obligatoire) : page ou adresse de contact ;
   - captures d'écran iPhone 6,9 po (1320 × 2868) ; 3 minimum, 10 maximum ;
   - description, sous-titre, mots-clés, catégorie (Cuisine et boissons ou Style de vie) ;
   - classification par âge : questionnaire (aucun contenu sensible → 4+).
4. 🧑 **Confidentialité de l'app** (étiquettes) — données collectées, toutes liées à
   l'utilisateur, utilisées pour le fonctionnement de l'app, **aucun suivi** :
   - Coordonnées → Adresse courriel ;
   - Contenu utilisateur → Autre contenu (recettes, listes, prénoms des membres) ;
   - Identifiants → ID utilisateur.
5. 🧑 **Informations pour l'examen** : renseigner l'adresse `REVIEW_ACCOUNT_EMAIL` et
   expliquer : « Saisir cette adresse, toucher Continuer, puis saisir le code
   `REVIEW_ACCOUNT_CODE`. Créer une famille pour accéder aux fonctionnalités. »
   Sans ce compte, Apple ne peut pas se connecter et rejette l'app.

## 4. Build et envoi

```bash
pnpm --filter @yumi/mobile build:ios      # build de production signé, dans le nuage
pnpm --filter @yumi/mobile submit:ios     # envoie le dernier build à App Store Connect
```

Au premier build, EAS propose de créer les certificats et le profil de provisionnement :
accepter. Aux questions sur les notifications push (« Setup Push Notifications », « Generate
a new Apple Push Notifications service key ») : **oui**, l'app envoie des rappels. Au premier envoi, il demande l'identifiant Apple et l'app cible.

Le build apparaît dans **TestFlight** après traitement par Apple (10 à 30 min). Le tester
sur un vrai iPhone, puis l'associer à la version dans App Store Connect et **Soumettre
pour examen**.

## Mises à jour suivantes

1. Changements notés dans « Non publié » du CHANGELOG.
2. `pnpm release patch|minor` puis `git push --follow-tags`.
3. Déployer l'API **avant** l'app si l'app dépend de nouvelles routes : les versions déjà
   installées continuent d'utiliser l'API, qui doit rester rétrocompatible.
4. `build:ios` puis `submit:ios`, nouvelle version dans App Store Connect.

## Liste de vérification avant envoi

- [ ] API de production en ligne, `GET /health` répond `{"status":"ok"}`.
- [ ] Courriel de connexion reçu sur une vraie adresse (pas dans les indésirables).
- [ ] Compte de démonstration testé de bout en bout sur le build TestFlight.
- [ ] Suppression du compte testée (Famille → Supprimer mon compte).
- [ ] Politique de confidentialité et page d'assistance en ligne.
- [ ] Captures d'écran, description, étiquettes de confidentialité remplies.
- [ ] Version (`pnpm release`) et étiquette Git poussées.
