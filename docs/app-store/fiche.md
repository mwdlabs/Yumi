# Fiche App Store de Yumi

Textes prêts à copier dans [App Store Connect](https://appstoreconnect.apple.com/apps/6835705236)
(langue : **Français (Canada)**). Les limites de longueur d'Apple sont indiquées entre
parenthèses et respectées.

## Informations sur l'app

| Champ                  | Valeur                                                        |
| ---------------------- | ------------------------------------------------------------- |
| Nom (30)               | `Yumi – Repas en famille`                                     |
| Sous-titre (30)        | `Menus et courses partagés`                                   |
| Catégorie principale   | Cuisine et boissons                                           |
| Catégorie secondaire   | Style de vie                                                  |
| Prix                   | Gratuit                                                       |
| Disponibilité          | Canada pour commencer (l'app n'existe qu'en français)         |
| Droits d'auteur        | `2026 MWD Labs`                                               |
| Classification par âge | 4+ (répondre « Aucun » partout ; aucun contenu généré public) |

Le nom sous l'icône de l'iPhone reste « Yumi » : il vient de l'app, pas de la fiche.

## Texte promotionnel (170)

Modifiable à tout moment, sans nouvelle version.

```
Fini le « on mange quoi ce soir ? ». Choisissez les plats de la semaine en famille : la liste de courses se remplit toute seule.
```

## Description (4000)

```
Yumi organise les repas de la semaine en famille : qui cuisine quoi, quel jour, et ce qu'il faut acheter.

LA SEMAINE EN UN COUP D'ŒIL
Chaque jour a sa carte : le plat prévu et la personne qui cuisine. Choisir un plat prend deux touches. Les jours libres sont bien visibles, et aujourd'hui est mis en évidence.

UNE LISTE DE COURSES QUI SE FAIT TOUTE SEULE
Dès qu'un plat est choisi, ses ingrédients arrivent dans la liste de la semaine. Yumi additionne les quantités (500 g + 1 kg de riz = 1,5 kg), convertit les unités et indique pour quel plat chaque article est nécessaire. Un plat change ou disparaît ? La liste suit, même pour les articles déjà cochés.

VOS RECETTES DE FAMILLE
Enregistrez vos plats habituels avec leurs ingrédients. Une vingtaine de plats connus (yassa, mafé, thiéboudienne, pâtes…) et un catalogue d'ingrédients accélèrent la saisie : un seul toucher préremplit tout.

DES RAPPELS AU BON MOMENT
Pas encore d'idée ? Réservez simplement votre jour. La veille de l'échéance, Yumi vous rappelle de choisir votre plat. À l'échéance, le responsable des courses est prévenu : la liste est prête.

LES ESSENTIELS, SANS Y PENSER
Lait, pain, œufs : vos achats de chaque semaine s'ajoutent automatiquement à la liste.

EN MAGASIN
La liste est partagée : cochez les articles au fur et à mesure, tout le monde voit ce qui reste. Chacun peut aussi ajouter un article à la main.

TOUTE LA FAMILLE
Invitez les adultes avec un code à 6 chiffres. Ajoutez les enfants comme profils, sans adresse courriel, pour leur confier un repas. Chaque membre a sa couleur et son emoji.

SIMPLE ET RESPECTUEUX
• Connexion par code reçu par courriel : aucun mot de passe à retenir.
• Aucune publicité, aucun suivi.
• Vos données sont hébergées au Canada.
• Supprimez votre compte à tout moment depuis l'app.
```

## Mots-clés (100)

Séparés par des virgules, sans espace. Ne pas répéter les mots du nom ni du sous-titre.

```
planificateur,menu,semaine,liste,épicerie,recette,cuisine,souper,dîner,partage,organisation,ménage
```

## Nouveautés de cette version (4000)

```
Première version de Yumi : planification des repas de la semaine, recettes de famille, liste de courses partagée et automatique, et rappels pour choisir son plat à temps.
```

## URL

| Champ                           | Valeur                                              |
| ------------------------------- | --------------------------------------------------- |
| Politique de confidentialité ⚠️ | `https://mwdlabs.ca/yumi/confidentialite` (à créer) |
| Assistance ⚠️                   | `https://mwdlabs.ca/yumi/assistance` (à créer)      |
| Marketing (facultatif)          | `https://mwdlabs.ca/yumi`                           |

Contenu des pages : [`../politique-de-confidentialite.md`](../politique-de-confidentialite.md)
et [`assistance.md`](assistance.md), à publier sur le site Squarespace de `mwdlabs.ca`.

## Confidentialité de l'app (étiquettes)

« Collectez-vous des données ? » → **Oui**. Pour chaque type : **lié à l'identité**,
**non utilisé pour le suivi**, finalité **Fonctionnalité de l'app** uniquement.

| Catégorie Apple          | Type             | Pourquoi                           |
| ------------------------ | ---------------- | ---------------------------------- |
| Coordonnées              | Adresse courriel | Connexion                          |
| Coordonnées              | Nom              | Prénom ou surnom des membres       |
| Contenu de l'utilisateur | Autre contenu    | Recettes, plats, listes de courses |
| Identifiants             | ID utilisateur   | Compte et sessions                 |

Ne **pas** cocher : localisation, contacts, photos, achats, historique, diagnostics,
données d'utilisation (l'app n'en collecte aucune).

## Informations pour l'examen

| Champ             | Valeur                                                      |
| ----------------- | ----------------------------------------------------------- |
| Connexion requise | Oui                                                         |
| Nom d'utilisateur | `revue@yumi.mwdlabs.ca`                                     |
| Mot de passe      | Le code : 🖥️ `grep REVIEW_ACCOUNT_CODE /opt/yumi/api.env`   |
| Coordonnées       | Prénom, nom, téléphone et courriel de la personne à joindre |

Notes (en anglais, pour l'examinateur) :

```
Yumi uses passwordless sign-in: the user enters an email address and receives a 6-digit code.
For review, use the demo account above: enter the email, tap "Continuer", then enter the code given in the password field. No email is sent to this demo address; the code is fixed.
After sign-in, tap "Créer une famille" to access all features (week plan, recipes, shopping list, family).
Account deletion: Famille tab > "Supprimer mon compte".
The app is in French only.
```

## Captures d'écran

Obligatoire : **iPhone 6,9 po**, 1320 × 2868 px (portrait), 3 à 10 images. Apple les
réduit pour les autres tailles. L'iPad n'est pas requis (`supportsTablet: false`).

Ordre conseillé, avec une famille de démonstration bien remplie (4 membres, 6 ou 7 plats
dans la semaine, une dizaine de recettes) :

1. **Semaine** : tous les jours remplis, cuisiniers variés. Titre : « Qui cuisine quoi, cette semaine ».
2. **Courses** : liste fusionnée, quelques articles cochés, mention « Pour : … ». Titre :
   « La liste se remplit toute seule ».
3. **Recette** : un plat connu avec ses ingrédients. Titre : « Vos recettes de famille ».
4. **Choix du plat** d'un jour. Titre : « Un plat en deux touches ».
5. **Famille** : membres avec avatars. Titre : « Toute la famille, enfants compris ».
6. **Mes essentiels**. Titre : « Vos achats de chaque semaine, ajoutés pour vous ».
