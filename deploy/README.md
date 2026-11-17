# Déploiement de l'API sur le Droplet (à côté de n8n)

L'API Yumi tourne sur le Droplet DigitalOcean qui héberge déjà n8n, dans une pile Docker
**séparée** (`/opt/yumi`). Le seul point commun est le conteneur Caddy de n8n
(`/opt/n8n`), qui sert aussi **https://api.yumi.mwdlabs.ca** en HTTPS.

| Élément      | Valeur                                     |
| ------------ | ------------------------------------------ |
| Serveur      | `mwdadmin@143.198.46.81` (root désactivé)  |
| URL de l'API | `https://api.yumi.mwdlabs.ca/v1`           |
| Pile Yumi    | `/opt/yumi`                                |
| Sauvegardes  | `/var/backups/yumi` (chaque nuit à 3 h 30) |

```
Internet ──443──▶ n8n-caddy-1 ──┬─ réseau n8n ──▶ n8n
                                └─ réseau proxy ─▶ yumi-api-1 ── réseau interne ──▶ postgres, redis
```

Plafonds de mémoire : API 256 Mo, PostgreSQL 256 Mo, Redis 64 Mo (≈ 150 Mo utilisés au
repos). **Passer le Droplet à 4 Go avant le lancement public.**

Légende : 💻 = Terminal du Mac, 🖥️ = sur le serveur (`ssh mwdadmin@143.198.46.81`).
`mwdadmin` fait partie du groupe `docker` : les commandes `docker` se lancent sans `sudo`.

## Installation (une seule fois)

### 1. Déjà fait côté n8n ✅

- DNS `api.yumi.mwdlabs.ca` → Droplet.
- Réseau Docker `proxy` créé, Caddy de n8n rattaché.
- Site `api.yumi.mwdlabs.ca` → `yumi-api-1:3000` dans le `Caddyfile` de `/opt/n8n`.
  **Ne pas l'ajouter une seconde fois.**

### 2. Clé SSH sans demande de phrase de passe

La clé est déjà installée sur le serveur, mais elle est protégée par une phrase de passe.
Le script de déploiement se connecte plusieurs fois : enregistrer la phrase de passe dans
le trousseau macOS, une seule fois. 💻

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
ssh mwdadmin@143.198.46.81 'echo ok'      # doit répondre « ok » sans rien demander
```

### 3. Dossiers de Yumi

🖥️

```bash
sudo mkdir -p /opt/yumi /var/backups/yumi
sudo chown mwdadmin:mwdadmin /opt/yumi /var/backups/yumi
```

### 4. Secrets de Yumi

🖥️

```bash
cd /opt/yumi
printf 'YUMI_VERSION=0\nPOSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)" > .env
nano api.env          # coller deploy/api.env.example et le compléter
chmod 600 .env api.env
```

Générer `HASH_SECRET` et `JWT_ACCESS_SECRET` avec `openssl rand -base64 48` (deux valeurs
différentes). Ces fichiers ne sont **jamais** versionnés.

### 5. Premier déploiement

💻 depuis la racine du dépôt (arbre Git propre, Docker Desktop lancé) :

```bash
pnpm deploy:api          # serveur par défaut : mwdadmin@143.198.46.81
```

💻 Vérifier : `curl https://api.yumi.mwdlabs.ca/health` → `{"status":"ok"}`.

### 6. Sauvegardes quotidiennes

🖥️ `crontab -e` (crontab de `mwdadmin`), puis ajouter. 3 h 30 : après la sauvegarde de
n8n (3 h 15).

```
30 3 * * * /opt/yumi/backup.sh >> /var/backups/yumi/backup.log 2>&1
```

Les copies (14 jours) sont dans `/var/backups/yumi`. Activer aussi les **Backups** du
Droplet dans DigitalOcean pour une copie hors du serveur.

Restaurer : 🖥️
`gunzip -c /var/backups/yumi/FICHIER.sql.gz | docker compose -f /opt/yumi/compose.yml exec -T postgres psql -U yumi yumi`

## Mises à jour

💻 `pnpm deploy:api` : construit l'image du commit courant, l'envoie,
applique les migrations et redémarre l'API (quelques secondes d'interruption).

**Retour arrière** : 🖥️ dans `/opt/yumi/.env`, remettre la `YUMI_VERSION` précédente
(`docker image ls yumi-api`), puis `docker compose up -d api`. Attention : les migrations
de base de données ne sont pas annulées.

Nettoyer les anciennes images de temps en temps : 🖥️ `docker image prune -a` (supprime les
images inutilisées, y compris celles de n8n non utilisées).

## Diagnostic

🖥️ dans `/opt/yumi` :

| Besoin            | Commande                                         |
| ----------------- | ------------------------------------------------ |
| État des services | `docker compose ps`                              |
| Journaux de l'API | `docker compose logs -f --tail 100 api`          |
| Mémoire utilisée  | `docker stats --no-stream`                       |
| Console SQL       | `docker compose exec postgres psql -U yumi yumi` |
