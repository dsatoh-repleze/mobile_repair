FROM php:8.4-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    bash \
    curl \
    git \
    libpng-dev \
    libzip-dev \
    libonig-dev \
    default-mysql-client \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip

# Install Redis extension
RUN pecl install redis \
    && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files first for better caching
COPY composer.json composer.lock ./

# Install dependencies (including dev for development)
RUN composer install --optimize-autoloader --no-interaction --no-scripts

# Copy application files
COPY . .

# Run post-install scripts
RUN composer dump-autoload --optimize

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Expose port (Cloud Run uses PORT env var, default 8080)
EXPOSE 8080

# Start Laravel server using PORT env var (default 8080 for Cloud Run)
CMD php artisan serve --host=0.0.0.0 --port=${PORT:-8080}
