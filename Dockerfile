FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libsqlite3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install pdo pdo_sqlite

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY backend backend/
COPY worker worker/
COPY start.sh /start.sh
RUN chmod +x /start.sh

RUN cd backend && composer install --no-dev --optimize-autoloader

RUN cd backend && php artisan key:generate

RUN cd worker && npm ci --omit=dev

RUN mkdir -p backend/storage/framework/{cache,sessions,views} \
    backend/storage/logs \
    backend/bootstrap/cache \
    && touch backend/database/database.sqlite

EXPOSE 8080 3001

CMD ["/start.sh"]
