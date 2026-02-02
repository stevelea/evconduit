#!/bin/bash
# Sync backups to offsite NAS via Tailscale + SMB
# Runs after local backups complete

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
NAS_MOUNT="/mnt/nas-backup"
LOG_FILE="$BACKUP_DIR/backup.log"

echo "$(date '+%Y-%m-%d %H:%M:%S') Starting NAS sync..." >> "$LOG_FILE"

# Check if NAS is mounted
if ! mountpoint -q "$NAS_MOUNT"; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') NAS not mounted, attempting mount..." >> "$LOG_FILE"
    mount "$NAS_MOUNT" 2>> "$LOG_FILE" || {
        echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: Failed to mount NAS" >> "$LOG_FILE"
        exit 1
    }
fi

# Sync database backups
rsync -av --progress "$BACKUP_DIR"/*.sql.gz "$NAS_MOUNT/" 2>> "$LOG_FILE"

# Sync config backups
if [ -d "$BACKUP_DIR/configs" ]; then
    mkdir -p "$NAS_MOUNT/configs"
    rsync -av --progress "$BACKUP_DIR/configs/"*.tar.gz "$NAS_MOUNT/configs/" 2>> "$LOG_FILE"
fi

# Copy latest backup log
cp "$LOG_FILE" "$NAS_MOUNT/backup.log" 2>> "$LOG_FILE"

# Count files on NAS
DB_COUNT=$(ls -1 "$NAS_MOUNT"/*.sql.gz 2>/dev/null | wc -l)
CONFIG_COUNT=$(ls -1 "$NAS_MOUNT/configs"/*.tar.gz 2>/dev/null | wc -l)

echo "$(date '+%Y-%m-%d %H:%M:%S') NAS sync completed. $DB_COUNT database backups, $CONFIG_COUNT config backups on NAS." >> "$LOG_FILE"
