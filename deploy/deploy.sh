#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export DOCKER_HOST=unix:///run/airlines-docker/docker.sock

image=${1:?image digest required}
commit=${2:?commit required}
[[ "$image" =~ ^ghcr\.io/is-courswork/frontend@sha256:[a-f0-9]{64}$ ]] || exit 2
[[ "$commit" =~ ^[a-f0-9]{40}$ ]] || exit 2

# The OCI archive preserves the digest, but may omit the repository name.
image_id=${image##*@}
[[ "$(docker image inspect --format '{{.Id}}' "$image_id")" == "$image_id" ]]
revision=$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image_id")
[[ "$revision" == "$commit" ]]

project=/opt/airlines
base="$project/frontend"
mkdir -p "$base/releases"
# Shared with core deployments so configuration changes cannot overlap.
exec 9>"$project/deploy.lock"
flock -w 600 9
release="$base/releases/$commit"
previous=$(readlink -f "$base/current" || true)
mkdir -p "$release"
tar -xzf "$project/incoming/frontend-$commit.tar.gz" -C "$release" --no-same-owner
printf 'FRONTEND_IMAGE=%s\n' "$image_id" > "$release/.release.env"

compose() {
    local dir=$1
    shift
    docker compose --project-name airlines-frontend --env-file "$dir/.release.env" \
      -f "$dir/compose.yaml" "$@"
}

rollback() {
    local status=$?
    trap - ERR
    compose "$release" logs --tail 40 frontend || true
    if [[ -n "$previous" && -f "$previous/.release.env" ]]; then
        compose "$previous" up -d --wait --wait-timeout 90 || true
    fi
    exit "$status"
}
compose "$release" config --quiet
trap rollback ERR
compose "$release" up -d --pull never --wait --wait-timeout 90
# Check the application and a deep link over the same network as the gateway.
docker exec airlines-caddy-1 wget -q -O /dev/null http://frontend:8080/
docker exec airlines-caddy-1 wget -q -O /dev/null http://frontend:8080/runs
deployed=$(docker exec airlines-caddy-1 wget -q -O - http://frontend:8080/frontend-version.json)
python3 -c 'import json,sys; assert json.loads(sys.argv[1])["commit"] == sys.argv[2]' "$deployed" "$commit"

ln -sfn "$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
rm -f "$project/incoming/frontend-$commit.tar.gz"
echo "Deployed frontend $commit ($image)"
compose "$release" ps
