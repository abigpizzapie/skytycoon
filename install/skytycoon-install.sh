#!/usr/bin/env bash
# Copyright (c) 2021-2026 community-scripts ORG
# License: MIT
# Source: SkyTycoon - Offline Airline Management Simulator
# Repo: https://github.com/abigpizzapie/skytycoon

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"

color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

msg_info "Installing Dependencies"
$STD apt-get install -y \
  nginx \
  git \
  php-fpm
msg_ok "Installed Dependencies"

msg_info "Installing ${APP}"
cd /opt
$STD git clone --depth 1 https://github.com/abigpizzapie/skytycoon.git skytycoon
mkdir -p /var/www/html
cp -r /opt/skytycoon/css /opt/skytycoon/js /opt/skytycoon/index.html /var/www/html/
msg_ok "Installed ${APP}"

msg_info "Creating Service"
cat <<EOF >/etc/nginx/sites-available/skytycoon
server {
    listen 8000;
    server_name _;
    root /var/www/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ =404;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location ~* \.(js|css)$ {
        add_header Content-Type "application/javascript";
        expires 1h;
    }
}
EOF

ln -sf /etc/nginx/sites-available/skytycoon /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
$STD systemctl enable -q --now nginx
msg_ok "Created Service"

motd_ssh
customize
cleanup_lxc
