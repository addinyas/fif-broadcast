FROM php:8.2-cli AS backend

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libsqlite3-dev \
    libgd-dev \
    libzip-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install pdo pdo_sqlite gd zip

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app/backend
COPY backend .
RUN composer install --no-dev --optimize-autoloader --no-interaction

RUN mkdir -p storage/framework/{cache,sessions,views} \
    storage/logs \
    bootstrap/cache

FROM node:22-alpine AS frontend-build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend .
RUN npm run build

FROM node:22-alpine AS worker-deps

WORKDIR /app
COPY worker/package.json worker/package-lock.json ./
RUN npm ci --omit=dev
COPY worker/src ./src

FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    libsqlite3-dev \
    libgd-dev \
    libzip-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install pdo pdo_sqlite gd zip

COPY --from=backend /app/backend /app/backend
COPY --from=frontend-build /app/dist /app/frontend/dist
COPY --from=worker-deps /app /app/worker

RUN apt-get install -y nginx-light && rm -rf /var/lib/apt/lists/*

COPY nginx.conf /etc/nginx/sites-enabled/default
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080 3001

CMD ["/start.sh"]
