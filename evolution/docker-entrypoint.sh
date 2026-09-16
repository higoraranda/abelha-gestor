#!/bin/bash

sed -i "s|DATABASE_CONNECTION_URI=.*|DATABASE_CONNECTION_URI=${DATABASE_CONNECTION_URI}|" /evolution/.env

# Desabilita Redis — remove qualquer linha existente e força false no final
sed -i '/REDIS_ENABLED/d' /evolution/.env
sed -i '/CACHE_REDIS/d' /evolution/.env
echo "REDIS_ENABLED=false" >> /evolution/.env
echo "CACHE_REDIS_ENABLED=false" >> /evolution/.env

cd /evolution

export DATABASE_URL="${DATABASE_CONNECTION_URI}"

rm -rf ./prisma/migrations
cp -r ./prisma/postgresql-migrations ./prisma/migrations

echo "Applying database migrations..."
npx prisma migrate deploy --schema ./prisma/postgresql-schema.prisma

echo "Generating Prisma client..."
npx prisma generate --schema ./prisma/postgresql-schema.prisma

echo "Starting application..."
exec npm run start:prod
