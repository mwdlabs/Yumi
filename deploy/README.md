# Déploiement de l'API sur le Droplet (à côté de n8n)

L'API Yumi tourne sur le Droplet DigitalOcean qui héberge déjà n8n, dans une pile Docker
**séparée** (`/opt/yumi`). Le seul point commun est le conteneur Caddy de n8n
(`/opt/n8n`), qui sert aussi `api.<domaine>` en HTTPS.

```
Internet ──443──▶ n8n-caddy-1 ──┬─ réseau n8n ──▶ n8n
                                └─ réseau proxy ─▶ yumi-api-1 ── réseau interne ──▶ postgres, redis
```

Plafonds de mémoire : API 256 Mo, PostgreSQL 256 Mo, Redis 64 Mo (≈ 150 Mo utilisés au
repos). **Passer le Droplet à 4 Go avant le lancement public.**

Légende : 💻 = Terminal du Mac, 🖥️ = sur le serveur (`ssh root@ADRESSE_IP`).

## Installation (une seule fois)

### 1. DNS

Chez le gestionnaire du domaine : enregistrement **A** `api` → adresse IP du Droplet.
Vérifier : 💻 `dig +short api.DOMAINE` doit afficher l'IP.

### 2. Connexion SSH par clé

Le script de déploiement se connecte plusieurs fois : il faut une clé, pas un mot de passe.
💻 `ssh root@ADRESSE_IP 'echo ok'` doit répondre `ok` sans rien demander. Sinon :
💻 `ssh-copy-id root@ADRESSE_IP`.

### 3. Réseau partagé avec Caddy

🖥️

```bash
docker network create proxy
cp /opt/n8n/docker-compose.yml /opt/n8n/docker-compose.yml.bak   # sauvegarde
```

Dans `/opt/n8n/docker-compose.yml` (adapter le nom du fichier s'il diffère), ajouter
`proxy` aux réseaux du service **caddy** et le déclarer comme réseau externe :

```yaml
services:
  caddy:
    # … configuration existante inchangée …
    networks:
      - n8n_egress_ou_réseau_existant # garder les réseaux déjà listés
      - proxy

networks:
  # … réseaux existants inchangés …
  proxy:
    external: true
```

### 4. Site Caddy

Ajouter à la fin du `Caddyfile` de `/opt/n8n` (remplacer `DOMAINE`) :

```
api.DOMAINE {
	encode gzip
	reverse_proxy yumi-api-1:3000
}
```

🖥️ Appliquer (Caddy redémarre en quelques secondes ; n8n n'est pas touché) :

```bash
cd /opt/n8n && docker compose up -d caddy
```

### 5. Secrets de Yumi

🖥️

```bash
mkdir -p /opt/yumi && cd /opt/yumi
printf 'YUMI_VERSION=0\nPOSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)" > .env
nano api.env          # coller deploy/api.env.example et le compléter
chmod 600 .env api.env
```

Générer `HASH_SECRET` et `JWT_ACCESS_SECRET` avec `openssl rand -base64 48` (deux valeurs
différentes). Ces fichiers ne sont **jamais** versionnés.

### 6. Premier déploiement

💻 depuis la racine du dépôt (arbre Git propre, Docker Desktop lancé) :

```bash
pnpm deploy:api root@ADRESSE_IP
```

💻 Vérifier : `curl https://api.DOMAINE/health` → `{"status":"ok"}`.

### 7. Sauvegardes quotidiennes

🖥️ `crontab -e`, puis ajouter :

```
30 3 * * * /opt/yumi/backup.sh >> /var/log/yumi-backup.log 2>&1
```

Les copies (14 jours) sont dans `/opt/yumi/backups`. Activer aussi les **Backups** du
Droplet dans DigitalOcean pour une copie hors du serveur.

Restaurer : 🖥️
`gunzip -c /opt/yumi/backups/FICHIER.sql.gz | docker compose -f /opt/yumi/compose.yml exec -T postgres psql -U yumi yumi`

## Mises à jour

💻 `pnpm deploy:api root@ADRESSE_IP` : construit l'image du commit courant, l'envoie,
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
