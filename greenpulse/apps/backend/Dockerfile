# ─────────────────────────────────────────
# Stage 1 — Développement
# ─────────────────────────────────────────
FROM node:20-alpine AS development

# Chrome pour Puppeteer/Lighthouse
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001 9091
CMD ["npm", "run", "start:dev"]

# ─────────────────────────────────────────
# Stage 2 — Build production
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ─────────────────────────────────────────
# Stage 3 — Production
# ─────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# User non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

WORKDIR /app
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs package.json ./

USER nestjs
EXPOSE 3001 9091
CMD ["node", "dist/main"]
