#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -eq 0 ]]; then
  echo "root 대신 sudo 권한이 있는 일반 사용자로 실행하세요."
  exit 1
fi

sudo apt-get update
sudo apt-get install -y ca-certificates curl mariadb-server nginx

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'Number(process.versions.node.split(`.`)[0])')" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

sudo systemctl enable --now mariadb nginx
npm ci --omit=dev 2>/dev/null || npm install --omit=dev

echo
echo "기본 패키지 설치 완료"
echo "다음 단계: ./deploy/linux/setup-db.sh"
