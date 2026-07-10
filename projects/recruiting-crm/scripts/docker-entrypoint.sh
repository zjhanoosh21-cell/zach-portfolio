#!/bin/sh
set -e

echo "==> Running database migrations..."
# Call the real CLI entry directly (not the .bin symlink, which Docker dereferences
# into a plain file that can't resolve its sibling .wasm/engine assets).
node node_modules/prisma/build/index.js migrate deploy

echo "==> Starting CRI CRM..."
exec node server.js
