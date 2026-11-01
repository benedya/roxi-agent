#!/bin/sh
# Installs the container's Linux dependencies into the node_modules volume (docker-compose.yml),
# only when package-lock.json changed since the last install.
#
# Usage: sh scripts/install-deps.sh           install if the lockfile changed
#        sh scripts/install-deps.sh --force   reinstall anyway
set -e

stamp=node_modules/.installed-lock

if [ "$1" != "--force" ] && cmp -s package-lock.json "$stamp"; then
  exit 0
fi
npm ci --no-fund --no-audit
cp package-lock.json "$stamp"
