#!/usr/bin/env bash
set -euo pipefail
BACKUP=/var/backups/portfolio-passkey/$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 700 "$BACKUP"
systemctl stop portfolio-passkey
trap 'systemctl start portfolio-passkey' EXIT
cp -a /var/lib/portfolio-passkey/. "$BACKUP/"
bash /tmp/passkey-space/deploy/install.sh
