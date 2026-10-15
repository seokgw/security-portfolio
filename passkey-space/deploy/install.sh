#!/usr/bin/env bash
set -euo pipefail
# Run on the existing diary VM: sudo bash /tmp/passkey-space/deploy/install.sh
DOMAIN=passkey.35.254.91.12.sslip.io
APP=/opt/portfolio-passkey
RUNTIME=/opt/portfolio-node24
SOURCE=/tmp/passkey-space
test -f "$SOURCE/server.js"
test "$(uname -m)" = x86_64
if ! test -x "$RUNTIME/bin/node"; then
  mkdir -p "$RUNTIME" /tmp/portfolio-node-download
  cd /tmp/portfolio-node-download
  curl -fsSLO https://nodejs.org/dist/v24.20.0/node-v24.20.0-linux-x64.tar.xz
  curl -fsSLO https://nodejs.org/dist/v24.20.0/SHASUMS256.txt
  grep ' node-v24.20.0-linux-x64.tar.xz$' SHASUMS256.txt | sha256sum -c -
  tar -xJf node-v24.20.0-linux-x64.tar.xz --strip-components=1 -C "$RUNTIME"
fi
id portfolio-passkey >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin portfolio-passkey
mkdir -p "$APP" /var/lib/portfolio-passkey /var/www/certbot
cp "$SOURCE/server.js" "$SOURCE/store.js" "$SOURCE/vault.js" "$SOURCE/package.json" "$SOURCE/pnpm-lock.yaml" "$APP/"
cp -R "$SOURCE/public" "$APP/"
cd "$APP"
export PATH="$RUNTIME/bin:$PATH"
# Install pinned production dependencies with the checked-in lockfile.
npm exec --yes --package=pnpm@11.19.0 -- pnpm install --prod --frozen-lockfile
chown -R root:root "$APP"
chown portfolio-passkey:portfolio-passkey /var/lib/portfolio-passkey
chmod 700 /var/lib/portfolio-passkey
cat > /etc/systemd/system/portfolio-passkey.service <<EOF
[Unit]
Description=Portfolio WebAuthn Private Space
After=network.target
[Service]
User=portfolio-passkey
Group=portfolio-passkey
WorkingDirectory=$APP
Environment=NODE_ENV=production
Environment=PORT=3008
Environment=ORIGIN=https://$DOMAIN
Environment=RP_ID=$DOMAIN
Environment=DB_PATH=/var/lib/portfolio-passkey/passkeys.sqlite
ExecStart=$RUNTIME/bin/node $APP/server.js
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/portfolio-passkey
UMask=0077
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now portfolio-passkey
systemctl restart portfolio-passkey
curl --retry 30 --retry-connrefused --retry-delay 2 -fsS http://127.0.0.1:3008/api/health
cat > /etc/nginx/sites-available/portfolio-passkey.next <<EOF
server {
  listen 80;
  server_name $DOMAIN;
  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  location / { return 301 https://\$host\$request_uri; }
}
EOF
if ! test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
  cp /etc/nginx/sites-available/portfolio-passkey.next /etc/nginx/sites-available/portfolio-passkey
  ln -sfn /etc/nginx/sites-available/portfolio-passkey /etc/nginx/sites-enabled/portfolio-passkey
  nginx -t
  systemctl reload nginx
  certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email
fi
cat >> /etc/nginx/sites-available/portfolio-passkey.next <<EOF
server {
  listen 443 ssl;
  server_name $DOMAIN;
  ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  add_header Strict-Transport-Security "max-age=31536000" always;
  location / {
    client_max_body_size 7m;
    proxy_pass http://127.0.0.1:3008;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$remote_addr;
    proxy_set_header X-Forwarded-Proto https;
  }
}
EOF
mv /etc/nginx/sites-available/portfolio-passkey.next /etc/nginx/sites-available/portfolio-passkey
ln -sfn /etc/nginx/sites-available/portfolio-passkey /etc/nginx/sites-enabled/portfolio-passkey
nginx -t
systemctl reload nginx
systemctl is-active portfolio-passkey pds-diary
curl --retry 10 --retry-all-errors --retry-delay 2 -fsS "https://$DOMAIN/api/health"
echo PASSKEY_DEPLOY_OK
