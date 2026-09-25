# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]

## [0.5.0] - 2026-09-25

Essentiels de la semaine.

### Ajouté

- « Mes essentiels » : articles ajoutés automatiquement à la liste de courses de chaque
  semaine (en cours et à venir, jamais les semaines passées).
  - 14 essentiels d'épicerie suggérés, pré-cochés, à ajouter en un tap : lait, œufs,
    pain, beurre, riz brisé, huile, oignons, bouillon, sucre, thé, café, bananes,
    papier de toilette, savon à vaisselle.
  - Ajout, modification (nom, quantité) et retrait, avec les mêmes suggestions que la
    liste de courses.
- Règles d'ajout automatique :
  - chaque semaine reçoit les essentiels une seule fois : un article retiré d'une
    semaine n'y revient pas ;
  - un article déjà ajouté à la main n'est pas doublé ;
  - un nouvel essentiel s'ajoute aussi aux listes déjà ouvertes ;
  - modifier un essentiel met à jour ses articles non cochés ;
  - retirer un essentiel l'enlève des semaines suivantes, mais pas de la semaine en cours.
- Onglet Courses : accès « Mes essentiels » (avec leur nombre) et badge « Essentiel »
  sur les articles concernés.

### Modifié

- Afficher la liste de la semaine en cours ou d'une semaine à venir crée cette semaine,
  pour y placer les essentiels (migration `family_staples`).

## [0.4.0] - 2026-09-24

Liste de courses hebdomadaire (première partie de la fonctionnalité 4 du MVP).

### Ajouté

- Liste de courses par semaine, partagée par la famille :
  - navigation entre les semaines (« Cette semaine », « La semaine prochaine »…) ;
  - semaine calculée dans le fuseau de la famille, selon son premier jour de semaine.
- Ajout d'articles à la main par n'importe quel membre, avec ou sans quantité :
  - mêmes suggestions que les recettes, plus les essentiels (fruits, café, thé…) et les
    articles de maison (papier de toilette, savon, sacs à ordures…) ;
  - un article déjà présent dans la semaine n'est pas ajouté en double (pluriel et casse
    ignorés) ;
  - modification et suppression des articles ajoutés à la main.
- Cochage en magasin :
  - coche instantanée (mise à jour optimiste), avec le nom du membre qui a coché ;
  - articles à cocher groupés par rayon, puis « Dans le panier » ;
  - barre de progression.
- Synchronisation : la liste se met à jour toute seule (toutes les 15 s, et au retour
  dans l'app), pour voir les coches des autres membres.
- Échéance de la semaine calculée et enregistrée à sa création : dernier jour et heure
  d'échéance de la famille avant le début de la semaine, heure avancée comprise.
- Logique de semaine partagée et testée (début, fin, semaine suivante et précédente,
  échéance, changement d'heure).

### Modifié

- Articles de liste : date d'ajout et membre ayant ajouté l'article (migration
  `shopping_item_added_by`).
- Les articles de maison ne sont jamais proposés dans une recette.

### Corrigé

- `pnpm --filter @yumi/api prisma:migrate --name …` transmet bien le nom à la migration
  (la commande restait bloquée en attente d'une saisie).

## [0.3.0] - 2026-09-24

Livre de recettes (première partie de la fonctionnalité 3 du MVP, avancée à la demande).

### Ajouté

- Recettes de la famille : création, modification, archivage.
  - Nom, nombre de portions et ingrédients dans l'ordre saisi.
  - Partagées avec tous les membres, invisibles pour les autres familles.
  - Pas de doublon de nom : casse et accents sont ignorés.
- Catalogue de **86 ingrédients** orienté cuisine sénégalaise, pâtes, vermicelles et
  couscous, avec unités par défaut, rayons et noms locaux reconnus (guedj, yète, jaxatu,
  nététou, dakhar, sow…).
- Catalogue de **24 plats connus**, avec leurs ingrédients habituels pour 6 personnes :
  - sénégalais : thiéboudienne, thiébou guinar, thiébou yapp, yassa poulet et poisson,
    mafé, domoda, soupou kandia, caldou, thiou, bassi salté, ndambé, dibi, accara, pastels,
    thiakry ;
  - pâtes et vermicelles : bolognaise, sauce tomate, macaronis au fromage, poulet à la
    crème, vermicelles au poulet, vermicelles sucrées ;
  - couscous : poulet et légumes, agneau et merguez.
- Saisie « au fil de l'eau » :
  - suggestions d'ingrédients dès les premières lettres, les habitudes de la famille
    d'abord ;
  - quantité (« 2 », « 1,5 », « 1/2 ») et unité en pastilles, ou « au goût » ;
  - la fenêtre reste ouverte pour enchaîner les ingrédients.
- Un tap sur un plat connu préremplit ses ingrédients ; en tapant un nom, les plats
  correspondants sont proposés.
- Logique partagée testée : normalisation des noms (casse, accents, pluriels), lecture
  des quantités, recherche dans le catalogue.
- Route `GET /families/:familyId/ingredients` : ingrédients déjà utilisés par la famille.
- Confirmation avant de quitter un écran de recette non enregistré.

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
