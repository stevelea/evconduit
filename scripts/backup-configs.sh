#!/bin/bash
# Backup configuration files and secrets that aren't in git
# Runs alongside the database backup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups/configs"
LOG_FILE="$PROJECT_DIR/backups/backup.log"

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
CONFIG_BACKUP="$BACKUP_DIR/evconduit_configs_${TIMESTAMP}.tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "$(date '+%Y-%m-%d %H:%M:%S') Starting config backup..." >> "$LOG_FILE"

# Files to backup (relative to project dir)
cd "$PROJECT_DIR"

# Create list of files to backup
CONFIG_FILES=(
    ".env"
    ".env.backup"
    ".env.backup.*"
    ".env.keep"
    ".env.local"
    "*-credentials.env"
    "docker-compose.override.yml"
    ".claude/settings.local.json"
)

# Build tar command with existing files only
TAR_FILES=""
for pattern in "${CONFIG_FILES[@]}"; do
    for file in $pattern; do
        if [ -f "$file" ]; then
            TAR_FILES="$TAR_FILES $file"
        fi
    done
done

if [ -n "$TAR_FILES" ]; then
    tar -czf "$CONFIG_BACKUP" $TAR_FILES 2>> "$LOG_FILE"

    BACKUP_SIZE=$(du -h "$CONFIG_BACKUP" | cut -f1)
    echo "$(date '+%Y-%m-%d %H:%M:%S') Config backup completed: $CONFIG_BACKUP ($BACKUP_SIZE)" >> "$LOG_FILE"

    # Keep only last 30 days of config backups
    find "$BACKUP_DIR" -name "evconduit_configs_*.tar.gz" -mtime +30 -delete

    CONFIG_COUNT=$(ls -1 "$BACKUP_DIR"/evconduit_configs_*.tar.gz 2>/dev/null | wc -l)
    echo "$(date '+%Y-%m-%d %H:%M:%S') Config cleanup done. $CONFIG_COUNT config backups retained." >> "$LOG_FILE"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') WARNING: No config files found to backup" >> "$LOG_FILE"
fi
