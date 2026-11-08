#!/bin/sh
set -eu
umask 077

# The CI invokes this BEFORE replacing compose, environment or images.
if [ ! -e docker-compose.yaml ] && [ ! -e .env ]; then
    echo "First deployment: no previous release to back up"
    exit 0
fi
test -f docker-compose.yaml
test -f .env

backup_dir="backups/$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -p "$backup_dir"
for config in docker-compose.yaml .env frontend.env nginx.conf Caddyfile grafana.env monitoring; do
    if [ -e "$config" ]; then
        cp -R "$config" "$backup_dir/"
    fi
done

# Use the running containers' exact image references, even if .env was changed.
for service in frontend backend; do
    container=$(docker compose ps -q "$service")
    if [ -n "$container" ]; then
        image=$(docker inspect --format '{{.Config.Image}}' "$container")
        case "$service" in
            frontend) printf '\nFRONTEND_IMAGE_NAME=%s\n' "$image" >> "$backup_dir/.env" ;;
            backend) printf '\nBACKEND_IMAGE_NAME=%s\n' "$image" >> "$backup_dir/.env" ;;
        esac
    fi
done

docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_dir/database.dump.partial"
test -s "$backup_dir/database.dump.partial"
docker compose exec -T postgres pg_restore --list < "$backup_dir/database.dump.partial" > /dev/null
mv "$backup_dir/database.dump.partial" "$backup_dir/database.dump"
echo "Backup completed: $backup_dir"
