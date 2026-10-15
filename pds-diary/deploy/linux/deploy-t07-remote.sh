#!/usr/bin/env bash
set -euo pipefail
APP_DIR=/home/a44458650/pds-diary
ARCHIVE=/tmp/pds-diary-t07-deploy.tar.gz
BACKUP_DIR=/var/backups/pds-diary/t07-20260901
STAGE_DIR=/tmp/pds-diary-t07-stage

test -d "${APP_DIR}"
test -f "${APP_DIR}/.env"
test -f "${ARCHIVE}"
echo PHASE_BACKUP
sudo mkdir -p "${BACKUP_DIR}" "${STAGE_DIR}"
sudo mariadb-dump pds_diary | sudo tee "${BACKUP_DIR}/pds_diary.sql" >/dev/null
sudo tar --exclude=node_modules -czf "${BACKUP_DIR}/pds-diary-before-t07.tar.gz" -C /home/a44458650 pds-diary
sudo chmod 600 "${BACKUP_DIR}"/*
echo PHASE_COPY
sudo tar -xzf "${ARCHIVE}" -C "${STAGE_DIR}"
sudo cp -a "${STAGE_DIR}/." "${APP_DIR}/"
sudo chown -R a44458650:a44458650 "${APP_DIR}"

echo PHASE_MIGRATION
if ! sudo mariadb -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='pds_diary' AND table_name='users'" | grep -qx 1; then
  sudo mariadb pds_diary < "${APP_DIR}/sql/migration-t07.sql"
fi
echo PHASE_ENV
if ! sudo grep -q '^JWT_SECRET=' "${APP_DIR}/.env"; then
  JWT_VALUE="$(openssl rand -hex 64)"
  printf '\nJWT_SECRET=%s\nJWT_ABSOLUTE_SECONDS=28800\nSESSION_IDLE_SECONDS=1800\n' "${JWT_VALUE}" | sudo tee -a "${APP_DIR}/.env" >/dev/null
  unset JWT_VALUE
fi
sudo chmod 600 "${APP_DIR}/.env"
echo PHASE_INSTALL
cd "${APP_DIR}"
sudo -u a44458650 npm install --omit=dev
sudo -u a44458650 node --check src/server.js
echo PHASE_RESTART
sudo systemctl restart pds-diary
sudo systemctl is-active --quiet pds-diary
curl --fail --silent http://127.0.0.1:3000/api/health >/dev/null
echo "T07_DEPLOY_OK"
