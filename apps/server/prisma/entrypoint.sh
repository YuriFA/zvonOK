#!/bin/sh
set -e

echo "Running migrations..."
pnpm exec prisma migrate deploy

echo "Running seed..."
pnpm exec prisma db seed

echo "Done!"
