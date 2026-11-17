# Image de production de l'API Yumi.
# Construire depuis la racine du monorepo :
#   docker build -f apps/api/Dockerfile -t yumi-api .
# Au démarrage, les migrations Prisma en attente sont appliquées, puis le serveur démarre.

FROM node:24-slim AS build
ENV HUSKY=0
RUN corepack enable
WORKDIR /app

# Dépendances d'abord (couche mise en cache tant que le lockfile ne change pas).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
RUN pnpm install --frozen-lockfile --filter @yumi/api...

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @yumi/api build \
  && pnpm --filter @yumi/api deploy --prod --legacy /out \
  && cp -r apps/api/dist /out/dist

# Image finale : dépendances de production seulement (Prisma CLI compris, pour les migrations).
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node dist/server.mjs"]
