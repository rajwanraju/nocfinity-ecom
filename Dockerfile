# syntax=docker/dockerfile:1
# Local/demo image for the Laravel API. Not a production PHP-FPM/nginx setup:
# the container runs `php artisan serve`, which is fine for `docker compose up`
# but not for production traffic (see docs/DOCKER.md).

FROM composer:2 AS vendor

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --no-scripts

COPY . .
RUN composer dump-autoload --no-dev --optimize --no-scripts

FROM php:8.4-cli-alpine

RUN apk add --no-cache oniguruma-dev \
    && docker-php-ext-install pdo_mysql mbstring opcache \
    && rm -rf /var/cache/apk/*

WORKDIR /var/www/html

COPY --from=vendor /app ./

# The public disk is the image directory; a named volume is mounted over
# storage/app/public in Compose so seeded and uploaded files survive restarts.
RUN mkdir -p \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && ln -sfn ../storage/app/public public/storage \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

COPY docker/entrypoint.sh /usr/local/bin/backend-entrypoint
RUN chmod +x /usr/local/bin/backend-entrypoint

USER www-data

EXPOSE 8000

ENTRYPOINT ["backend-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
