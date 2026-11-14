FROM caddy:2.11.9-alpine
ENV XDG_CONFIG_HOME=/tmp/caddy/config XDG_DATA_HOME=/tmp/caddy/data
COPY Caddyfile /etc/caddy/Caddyfile
COPY dist/ /srv/
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=10 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
