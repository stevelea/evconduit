'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/CodeBlock';
import { Database, HardDrive, Clock, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export default function BackupsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-indigo-700 mb-2">Backup & Restore Guide</h1>
      <p className="text-gray-600 mb-8">
        EVConduit automated backup system for database and configuration files.
      </p>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Database Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Daily at 3:00 AM</div>
            <p className="text-xs text-gray-500">Supabase PostgreSQL dump (~15 MB)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-green-600" />
              Config Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Daily at 3:05 AM</div>
            <p className="text-xs text-gray-500">Environment files & secrets (~6 KB)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              Retention Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">30 Days</div>
            <p className="text-xs text-gray-500">Older backups auto-deleted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-600" />
              Storage Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~450 MB</div>
            <p className="text-xs text-gray-500">30 days of backups</p>
          </CardContent>
        </Card>
      </div>

      {/* Backup Locations */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Backup Locations</h2>
        <CodeBlock
          code={`/root/evconduit/backups/
├── evconduit_backup_YYYYMMDD_HHMMSS.sql.gz   # Database backups
├── configs/
│   └── evconduit_configs_YYYYMMDD_HHMMSS.tar.gz  # Config backups
└── backup.log                                  # Backup logs`}
          language="bash"
        />
      </section>

      {/* What's Backed Up */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">What&apos;s Backed Up</h2>

        <h3 className="text-xl font-semibold mt-4 mb-2">Database Backup</h3>
        <p className="text-gray-600 mb-2">Complete PostgreSQL dump of Supabase database including:</p>
        <ul className="list-disc ml-6 space-y-1">
          <li>Users and authentication data</li>
          <li>Vehicles and cached vehicle data</li>
          <li>Subscriptions and billing records</li>
          <li>Webhook logs and API telemetry</li>
          <li>Application settings</li>
          <li>All other tables and data</li>
        </ul>

        <h3 className="text-xl font-semibold mt-6 mb-2">Configuration Backup</h3>
        <p className="text-gray-600 mb-2">Environment files and secrets not stored in git:</p>
        <ul className="list-disc ml-6 space-y-1">
          <li><code>.env</code> - Main environment configuration</li>
          <li><code>.env.backup*</code> - Previous environment versions</li>
          <li><code>.env.keep</code> - Protected environment backup</li>
          <li><code>*-credentials.env</code> - Service credentials</li>
          <li><code>.claude/settings.local.json</code> - Local Claude settings</li>
        </ul>
      </section>

      {/* Manual Backup */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Manual Backup Commands</h2>

        <h3 className="text-xl font-semibold mt-4 mb-2">Run Database Backup Now</h3>
        <CodeBlock
          code={`/root/evconduit/scripts/backup-supabase.sh`}
          language="bash"
        />

        <h3 className="text-xl font-semibold mt-4 mb-2">Run Config Backup Now</h3>
        <CodeBlock
          code={`/root/evconduit/scripts/backup-configs.sh`}
          language="bash"
        />

        <h3 className="text-xl font-semibold mt-4 mb-2">Check Backup Status</h3>
        <CodeBlock
          code={`# View backup log
cat /root/evconduit/backups/backup.log

# List all backups
ls -lh /root/evconduit/backups/*.gz
ls -lh /root/evconduit/backups/configs/*.gz`}
          language="bash"
        />
      </section>

      {/* Restore Procedures */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-yellow-600" />
          Restore Procedures
        </h2>

        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded mb-4">
          <strong>Warning:</strong> Restoring a database backup will overwrite all current data.
          Make sure you understand the implications before proceeding.
        </div>

        <h3 className="text-xl font-semibold mt-4 mb-2">Restore Database</h3>
        <p className="text-gray-600 mb-2">To restore from a database backup:</p>
        <CodeBlock
          code={`# 1. List available backups
ls -lh /root/evconduit/backups/evconduit_backup_*.sql.gz

# 2. Choose a backup and restore
# Replace YYYYMMDD_HHMMSS with the actual timestamp
gunzip -c /root/evconduit/backups/evconduit_backup_YYYYMMDD_HHMMSS.sql.gz | \\
  PGPASSWORD='your-db-password' psql \\
  -h db.your-project-ref.supabase.co \\
  -p 5432 \\
  -U postgres \\
  -d postgres

# Or using connection string from .env
source /root/evconduit/.env
gunzip -c /root/evconduit/backups/evconduit_backup_YYYYMMDD_HHMMSS.sql.gz | \\
  PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \\
  -h db.pynxbiclcdhkstglldvh.supabase.co \\
  -p 5432 \\
  -U postgres \\
  -d postgres`}
          language="bash"
        />

        <h3 className="text-xl font-semibold mt-6 mb-2">Restore Configuration Files</h3>
        <p className="text-gray-600 mb-2">To restore configuration files:</p>
        <CodeBlock
          code={`# 1. List available config backups
ls -lh /root/evconduit/backups/configs/evconduit_configs_*.tar.gz

# 2. View contents of a backup (without extracting)
tar -tzf /root/evconduit/backups/configs/evconduit_configs_YYYYMMDD_HHMMSS.tar.gz

# 3. Extract to current directory (will overwrite existing files!)
cd /root/evconduit
tar -xzf backups/configs/evconduit_configs_YYYYMMDD_HHMMSS.tar.gz

# 4. Or extract to a temporary directory first to review
mkdir /tmp/config-restore
tar -xzf /root/evconduit/backups/configs/evconduit_configs_YYYYMMDD_HHMMSS.tar.gz -C /tmp/config-restore
ls -la /tmp/config-restore/`}
          language="bash"
        />
      </section>

      {/* Cron Schedule */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Automated Schedule</h2>
        <p className="text-gray-600 mb-2">Backups are scheduled via cron:</p>
        <CodeBlock
          code={`# View current cron jobs
crontab -l

# Current schedule:
# 0 3 * * * /root/evconduit/scripts/backup-supabase.sh   # Database at 3:00 AM
# 5 3 * * * /root/evconduit/scripts/backup-configs.sh    # Configs at 3:05 AM`}
          language="bash"
        />

        <h3 className="text-xl font-semibold mt-4 mb-2">Modify Schedule</h3>
        <CodeBlock
          code={`# Edit cron jobs
crontab -e

# Example: Change to run at 2 AM instead
# 0 2 * * * /root/evconduit/scripts/backup-supabase.sh
# 5 2 * * * /root/evconduit/scripts/backup-configs.sh`}
          language="bash"
        />
      </section>

      {/* Disaster Recovery */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Disaster Recovery Checklist</h2>

        <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded mb-4">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <CheckCircle className="w-5 h-5" />
            Full Recovery Steps
          </div>
          <ol className="list-decimal ml-6 space-y-2">
            <li>Set up new server with Docker and required dependencies</li>
            <li>Clone the EVConduit repository from GitHub</li>
            <li>Restore configuration files from backup</li>
            <li>Restore database from backup</li>
            <li>Rebuild and start Docker containers</li>
            <li>Verify all services are running</li>
            <li>Test critical functionality</li>
          </ol>
        </div>

        <CodeBlock
          code={`# Full disaster recovery sequence
# 1. Clone repository
git clone https://github.com/stevelea/evconduit.git
cd evconduit

# 2. Copy backup files to new server (from external backup location)
scp -r user@backup-server:/backups/evconduit/* ./backups/

# 3. Restore config files
tar -xzf backups/configs/evconduit_configs_LATEST.tar.gz

# 4. Restore database
gunzip -c backups/evconduit_backup_LATEST.sql.gz | \\
  PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \\
  -h db.your-project.supabase.co -U postgres -d postgres

# 5. Build and start services
docker compose --project-name evconduit-new up -d --build

# 6. Verify services
docker ps
curl http://localhost:9100/api/ping`}
          language="bash"
        />
      </section>

      {/* Best Practices */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Best Practices</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>
            <strong>Off-site backups:</strong> Periodically copy backups to an external location
            (cloud storage, different server) for additional safety.
          </li>
          <li>
            <strong>Test restores:</strong> Periodically test the restore process to ensure
            backups are valid and the procedure works.
          </li>
          <li>
            <strong>Monitor backup logs:</strong> Check <code>backup.log</code> regularly to
            ensure backups are completing successfully.
          </li>
          <li>
            <strong>Encrypt sensitive backups:</strong> Consider encrypting config backups
            since they contain secrets.
          </li>
          <li>
            <strong>Document changes:</strong> Keep track of any manual database changes
            that might affect backup/restore procedures.
          </li>
        </ul>
      </section>

      {/* Troubleshooting */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Troubleshooting</h2>

        <h3 className="text-xl font-semibold mt-4 mb-2">Backup Failed</h3>
        <CodeBlock
          code={`# Check the backup log for errors
tail -50 /root/evconduit/backups/backup.log

# Common issues:
# - Database connection failed: Check SUPABASE_DB_PASSWORD in .env
# - Disk full: Clear old files or increase disk space
# - Permission denied: Ensure scripts are executable (chmod +x)`}
          language="bash"
        />

        <h3 className="text-xl font-semibold mt-4 mb-2">Restore Failed</h3>
        <CodeBlock
          code={`# If restore fails with permission errors, you may need to:
# 1. Drop and recreate the database (CAUTION: destroys all data)
# 2. Or restore to a fresh Supabase project

# Check PostgreSQL version compatibility
/usr/lib/postgresql/17/bin/pg_dump --version
# Backups made with pg_dump 17 should restore to PostgreSQL 17+`}
          language="bash"
        />
      </section>
    </main>
  );
}
