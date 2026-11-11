# Développement : cible utilisée par docker-compose.yml
FROM node:24-bookworm-slim AS development

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && chown -R node:node /app/node_modules

COPY --chown=node:node . .

USER node

EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]

# Construction des fichiers statiques
FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production : Nginx sert l'administration et relaie /api et /media
FROM nginx:1.27-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN mkdir -p /var/www/media

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
