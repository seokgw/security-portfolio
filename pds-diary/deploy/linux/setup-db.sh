#!/usr/bin/env bash
set -euo pipefail

read -r -p "애플리케이션 DB 사용자 [pds_app]: " DB_APP_USER
DB_APP_USER="${DB_APP_USER:-pds_app}"
read -r -s -p "새 DB 비밀번호: " DB_APP_PASSWORD
echo
if [[ -z "${DB_APP_PASSWORD}" ]]; then
  echo "빈 비밀번호는 사용할 수 없습니다."
  exit 1
fi

SQL_PASSWORD="$(printf "%s" "${DB_APP_PASSWORD}" | sed "s/'/''/g")"
sudo mariadb <<SQL
CREATE DATABASE IF NOT EXISTS pds_diary CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_APP_USER}'@'localhost' IDENTIFIED BY '${SQL_PASSWORD}';
ALTER USER '${DB_APP_USER}'@'localhost' IDENTIFIED BY '${SQL_PASSWORD}';
GRANT ALL PRIVILEGES ON pds_diary.* TO '${DB_APP_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

sudo mariadb pds_diary < sql/schema.sql
sudo mariadb pds_diary < sql/seed.sql

umask 077
cat > .env <<ENV
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_APP_USER}
DB_PASSWORD=${DB_APP_PASSWORD}
DB_NAME=pds_diary
PORT=3000
HOST=127.0.0.1
ENV

echo ".env, 스키마, 초기 데이터 생성 완료"
echo "다음 단계: npm run verify && ./deploy/linux/install-service.sh"
