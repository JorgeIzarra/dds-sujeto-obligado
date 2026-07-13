# ── Stage 1: build ────────────────────────────────────────────────────────────
# Instala todas las deps (dev incluidas), genera el cliente Prisma,
# compila TypeScript y poda las devDependencies.
FROM node:22-slim AS build
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci || npm install --no-audit --no-fund

# tsconfig.build.json extiende tsconfig.json; ambos son necesarios aquí.
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npx prisma generate \
 && npm run build \
 && npm prune --production

# ── Stage 2: production ───────────────────────────────────────────────────────
# Imagen mínima: solo código compilado + deps de producción (incluye
# @prisma/client con el cliente ya generado en stage anterior).
FROM node:22-slim AS production
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Las vistas EJS (añadidas en Sesión 3) se copian desde src/interfaces/views/.
COPY src/interfaces/views ./src/interfaces/views

EXPOSE 3000

# Ejecutar como usuario no-root (seguridad: SPEC-SEC-07)
USER node

CMD ["node", "dist/index.js"]
