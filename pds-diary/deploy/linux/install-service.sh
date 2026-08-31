#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
APP_USER="$(id -un)"
NODE_BIN="$(command -v node)"

if [[ ! -f "${APP_DIR}/.env" ]]; then
  echo ".env가 없습니다. setup-db.sh를 먼저 실행하세요."
  exit 1
fi

sudo tee /etc/systemd/system/pds-diary.service >/dev/null <<SERVICE
[Unit]
Description=Plan Do See Diary
After=network.target mariadb.service
Requires=mariadb.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_BIN} ${APP_DIR}/src/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable --now pds-diary

sudo tee /etc/nginx/sites-available/pds-diary >/dev/null <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

sudo ln -sfn /etc/nginx/sites-available/pds-diary /etc/nginx/sites-enabled/pds-diary
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl --no-pager --full status pds-diary

echo
echo "서비스 설치 완료: http://35.254.91.12"
echo "로그 확인: sudo journalctl -u pds-diary -f"
