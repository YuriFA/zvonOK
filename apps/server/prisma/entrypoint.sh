#!/bin/sh
set -e

echo "Running migrations..."
npx prisma migrate deploy

echo "Running seed..."
npx prisma db seed

echo "Done!"
