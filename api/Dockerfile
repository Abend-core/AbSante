# Les étapes qui exécutent du code (npm, tsc) tournent sur la machine de build
# ($BUILDPLATFORM), seule l'image finale est de la plateforme cible : on peut ainsi construire
# l'image ARM du Raspberry Pi depuis un PC x86 sans émulation. Les dépendances de l'API sont
# en JavaScript pur (pas de module natif), donc identiques quelle que soit l'architecture.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM --platform=$BUILDPLATFORM node:22-alpine AS deps
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3100
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3100)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
