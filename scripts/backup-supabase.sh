#!/bin/bash
# Supabase PostgreSQL Backup Script
# Runs daily via cron to backup the database

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$BACKUP_DIR/backup.log"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -E '^SUPABASE_URL=|^SUPABASE_DB_PASSWORD=' "$PROJECT_DIR/.env" | xargs)
fi

# Extract project ref from SUPABASE_URL
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -n 's|https://\([^.]*\)\.supabase\.co|\1|p')

if [ -z "$PROJECT_REF" ] || [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: Missing SUPABASE_URL or SUPABASE_DB_PASSWORD" >> "$LOG_FILE"
    exit 1
fi

# Database connection string
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
DB_PORT="5432"

# Backup filename with timestamp
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/evconduit_backup_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "$(date '+%Y-%m-%d %H:%M:%S') Starting backup..." >> "$LOG_FILE"

# Run pg_dump (use PostgreSQL 17 client for compatibility with Supabase)
PG_DUMP="/usr/lib/postgresql/17/bin/pg_dump"
PGPASSWORD="$SUPABASE_DB_PASSWORD" $PG_DUMP \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    -F p \
    > "$BACKUP_FILE" 2>> "$LOG_FILE"

if [ $? -eq 0 ]; then
    # Compress the backup
    gzip "$BACKUP_FILE"

    BACKUP_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
    echo "$(date '+%Y-%m-%d %H:%M:%S') Backup completed: $BACKUP_FILE_GZ ($BACKUP_SIZE)" >> "$LOG_FILE"

    # Keep only last 30 days of backups
    find "$BACKUP_DIR" -name "evconduit_backup_*.sql.gz" -mtime +30 -delete

    # Count remaining backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/evconduit_backup_*.sql.gz 2>/dev/null | wc -l)
    echo "$(date '+%Y-%m-%d %H:%M:%S') Cleanup done. $BACKUP_COUNT backups retained." >> "$LOG_FILE"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: Backup failed!" >> "$LOG_FILE"
    exit 1
fi
