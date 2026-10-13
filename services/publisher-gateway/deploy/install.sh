#!/usr/bin/env bash
set -euo pipefail
release_dir="$1"
base_dir=/opt/opentu-publisher
domain=op.47.107.92.13.nip.io
test -f "$release_dir/services/publisher-gateway/server.mjs"
test -f "$release_dir/dist/apps/web/index.html"
test -f /etc/opentu-publisher.env
# Keep previous hashed chunks available for open tabs and cached app shells.
previous_assets="$base_dir/current/dist/apps/web/assets"
if test -d "$previous_assets"; then
    cp -an "$previous_assets/." "$release_dir/dist/apps/web/assets/"
fi
if ! id opentu-publisher >/dev/null 2>&1; then
    useradd --system --home-dir /var/lib/opentu-publisher --shell /usr/sbin/nologin opentu-publisher
fi
install -d -m 700 -o opentu-publisher -g opentu-publisher /var/lib/opentu-publisher
chown root:opentu-publisher /etc/opentu-publisher.env
chmod 640 /etc/opentu-publisher.env
chmod -R a+rX "$release_dir"
install -d -m 755 /var/www/opentu-acme
certificate_dir="/etc/letsencrypt/live/$domain"
if test -f /etc/opentu-publisher/tls/fullchain.pem && test -f /etc/opentu-publisher/tls/privkey.pem; then
    certificate_dir=/etc/opentu-publisher/tls
fi
if ! test -f "$certificate_dir/fullchain.pem" || ! test -f "$certificate_dir/privkey.pem"; then
    install -m 644 "$release_dir/services/publisher-gateway/deploy/nginx-http.conf" /etc/nginx/conf.d/opentu-test.conf
    nginx -t
    systemctl reload nginx
    certbot certonly --webroot -w /var/www/opentu-acme -d "$domain" --non-interactive --agree-tos --register-unsafely-without-email
fi
openssl x509 -in "$certificate_dir/fullchain.pem" -noout -checkend 0 -checkhost "$domain"
sed "s|/etc/letsencrypt/live/$domain/|$certificate_dir/|g" "$release_dir/services/publisher-gateway/deploy/nginx-https.conf" > /etc/nginx/conf.d/opentu-test.conf
nginx -t
ln -sfn "$release_dir" "$base_dir/current"
install -m 644 "$release_dir/services/publisher-gateway/deploy/opentu-publisher.service" /etc/systemd/system/opentu-publisher.service
systemctl daemon-reload
systemctl enable --now opentu-publisher
systemctl restart opentu-publisher
systemctl reload nginx
install -d /etc/letsencrypt/renewal-hooks/deploy
install -m 755 "$release_dir/services/publisher-gateway/deploy/renew-hook.sh" /etc/letsencrypt/renewal-hooks/deploy/opentu-reload-nginx
systemctl enable --now certbot.timer
systemctl is-active opentu-publisher
