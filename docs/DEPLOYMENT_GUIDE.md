# EVConduit Production Deployment Guide

## Overview
Complete deployment guide for EVConduit - a full-stack EV management platform with Enode integration, Supabase backend, and Next.js frontend.

## Architecture
- **Backend**: FastAPI (Python) on port 9100
- **Frontend**: Next.js 15 (TypeScript) on port 3010
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase JWT (ES256)
- **Vehicle API**: Enode (sandbox/production)
- **Deployment**: Docker Compose

## Prerequisites
- Docker & Docker Compose
- Domain or IP address
- Supabase account
- Enode account (sandbox or production)

---

## Initial Setup

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd evconduit-ready-to-deploy
```

### 2. Configure Environment Variables
Copy the template and fill in your credentials:
```bash
cp .env.example .env
nano .env
```

**Required Variables:**
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Enode API Configuration
ENODE_CLIENT_ID=your-enode-client-id
ENODE_CLIENT_SECRET=your-enode-client-secret
ENODE_BASE_URL=https://enode-api.sandbox.enode.io
ENODE_AUTH_URL=https://oauth.sandbox.enode.io/oauth2/token
ENODE_WEBHOOK_SECRET=your-webhook-secret
REDIRECT_URI=http://your-domain.com:3010/dashboard

# Frontend Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_BASE_URL=http://your-domain.com:9100

# Server Configuration
BACKEND_PORT=9100
FRONTEND_PORT=3010
HOSTNAME=0.0.0.0

# Optional Services
STRIPE_SECRET_KEY=sk_test_xxx
BREVO_API_KEY=your-brevo-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
SENTRY_DSN=your-sentry-dsn

# Mock Mode (for testing without real Enode credentials)
MOCK_LINK_RESULT=false
```

### 3. Database Setup

**Run the master SQL script in Supabase SQL Editor:**

Location: `docs/database/00_master_schema_setup_fixed.sql`

This creates:
- `vehicles` - Vehicle data and cache
- `settings` - Application settings (rate limits)
- `subscriptions` - Stripe subscription data
- `onboarding` - User onboarding tracking
- `api_telemetry` - API usage logging
- `poll_logs` - Polling logs
- Row Level Security policies
- Initial settings data

**Set up your admin user:**
```sql
-- Update auth metadata
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'
WHERE email = 'your-email@example.com';

-- Insert/update public users table
INSERT INTO public.users (id, email, role, is_approved, accepted_terms, tier, name)
SELECT id, email, 'admin', true, true, 'pro', 'Your Name'
FROM auth.users WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO UPDATE 
SET role='admin', tier='pro', is_approved=true;
```

---

## Deployment

### Option 1: Production Deployment (Recommended)
```bash
# Build and start containers
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Check status
docker ps
docker logs evconduit-backend --tail 50
docker logs evconduit-frontend --tail 50

# Verify health
curl http://localhost:9100/api/ping
curl http://localhost:3010
```

### Option 2: Development Deployment
```bash
docker-compose up -d
```

---

## Post-Deployment Configuration

### 1. Verify Backend Health
```bash
# Check backend is running
curl http://your-domain.com:9100/api/ping
# Expected: {"status":"ok"}

# Check environment variables loaded
docker exec evconduit-backend python -c "from app.config import ENODE_BASE_URL, REDIRECT_URI; print('ENODE_BASE_URL:', ENODE_BASE_URL); print('REDIRECT_URI:', REDIRECT_URI)"
```

### 2. Verify Frontend
```bash
# Check frontend is serving
curl http://your-domain.com:3010
# Should return HTML
```

### 3. Test Authentication
1. Navigate to `http://your-domain.com:3010`
2. Sign up / Sign in with email
3. Check you can access dashboard

### 4. Test Vehicle Linking (Sandbox)

**Enode Sandbox Test Credentials:**
- Email: `9e26f1b8@sandbox.enode.com`
- Password: `5872c471`

**Steps:**
1. Go to Dashboard
2. Click "Link Vehicle"
3. Select vehicle brand (e.g., XPENG)
4. Enter test credentials
5. Complete authorization
6. Vehicle should appear in dashboard

---

## Known Issues & Fixes

### Issue 1: Frontend API URL Misconfiguration

**Problem:** Unlink button calls wrong port (3010 instead of 9100)

**Temporary Workaround:** Delete vehicles from Supabase dashboard

**Permanent Fix:**
```bash
# Update .env with correct API URL
nano .env
# Set: NEXT_PUBLIC_API_BASE_URL=http://your-domain.com:9100

# Rebuild frontend
docker-compose -f docker-compose.production.yml build frontend
docker-compose -f docker-compose.production.yml up -d
```

### Issue 2: JWT Authentication Errors

**Symptom:** "KeyError: 'id'" errors in logs

**Fix:** Already applied - all instances changed from `user["id"]` to `user["sub"]`

**Files Fixed:**
- `backend/app/api/me.py`
- `backend/app/api/private.py`

### Issue 3: Missing cryptography Library

**Fix:** Already added to `requirements.txt`:
```python
cryptography>=46.0.0
```

### Issue 4: Redirect URI 404 After Vehicle Linking

**Fix:** Set redirect to dashboard instead of non-existent route:
```bash
REDIRECT_URI=http://your-domain.com:3010/dashboard
```

---

## Switching to Production Mode

### 1. Get Production Enode Credentials
Contact Enode to activate production mode and get credentials.

### 2. Update Environment Variables
```bash
nano .env
```

Change:
```bash
# FROM (sandbox):
ENODE_BASE_URL=https://enode-api.sandbox.enode.io
ENODE_AUTH_URL=https://oauth.sandbox.enode.io/oauth2/token
ENODE_CLIENT_ID=sandbox-client-id
ENODE_CLIENT_SECRET=sandbox-secret

# TO (production):
ENODE_BASE_URL=https://enode-api.enode.io
ENODE_AUTH_URL=https://oauth.enode.io/oauth2/token
ENODE_CLIENT_ID=production-client-id
ENODE_CLIENT_SECRET=production-secret
```

### 3. Restart Services
```bash
docker-compose -f docker-compose.production.yml restart
```

### 4. Test with Real Vehicle
Link your actual EV using real credentials.

---

## Monitoring & Maintenance

### View Logs
```bash
# Backend logs
docker logs evconduit-backend -f

# Frontend logs
docker logs evconduit-frontend -f

# All logs
docker-compose -f docker-compose.production.yml logs -f
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.production.yml restart

# Restart specific service
docker-compose -f docker-compose.production.yml restart backend
```

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild containers
docker-compose -f docker-compose.production.yml build

# Restart with new images
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

### Database Backup
Regular backups via Supabase dashboard or CLI:
```bash
# Using Supabase CLI
supabase db dump -f backup.sql
```

---

## Troubleshooting

### Backend Container Crashes
```bash
# Check logs
docker logs evconduit-backend --tail 100

# Common causes:
# 1. Missing environment variables
# 2. Database connection issues
# 3. Invalid JWT configuration

# Verify environment
docker exec evconduit-backend env | grep -E "SUPABASE|ENODE"
```

### Frontend 404 Errors
```bash
# Check frontend logs
docker logs evconduit-frontend --tail 100

# Verify build
docker exec evconduit-frontend ls -la /app/.next
```

### Vehicle Linking Fails
```bash
# Check Enode configuration
docker exec evconduit-backend python -c "from app.config import ENODE_BASE_URL, ENODE_AUTH_URL, REDIRECT_URI, CLIENT_ID; print(f'BASE: {ENODE_BASE_URL}\nAUTH: {ENODE_AUTH_URL}\nREDIRECT: {REDIRECT_URI}\nCLIENT: {CLIENT_ID}')"

# Check backend logs during linking
docker logs evconduit-backend -f
```

### Database Connection Issues
```bash
# Test Supabase connection
docker exec evconduit-backend python -c "from app.database import supabase; print(supabase.table('users').select('*').limit(1).execute())"
```

---

## Security Considerations

### Production Checklist
- [ ] Use HTTPS (not HTTP) for all URLs
- [ ] Set strong `SUPABASE_JWT_SECRET`
- [ ] Rotate Enode credentials regularly
- [ ] Enable Supabase Row Level Security
- [ ] Use environment-specific `.env` files
- [ ] Never commit `.env` to version control
- [ ] Enable firewall rules (ports 9100, 3010)
- [ ] Set up SSL certificates (Let's Encrypt)
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts
- [ ] Regular security updates

### Environment Variable Security
```bash
# Set proper permissions
chmod 600 .env

# Use secrets management in production
# Consider: AWS Secrets Manager, HashiCorp Vault, etc.
```

---

## Performance Optimization

### Docker Optimization
```bash
# Limit container resources
docker-compose -f docker-compose.production.yml up -d \
  --scale backend=1 \
  --scale frontend=1
```

### Database Optimization
- Create indexes on frequently queried columns
- Regular VACUUM and ANALYZE
- Monitor slow queries
- Implement connection pooling

### Caching
- Enable Redis for session storage (future enhancement)
- Implement CDN for static assets
- Use HTTP caching headers

---

## Support & Resources

### Documentation
- Enode API: https://developers.enode.com
- Supabase: https://supabase.com/docs
- FastAPI: https://fastapi.tiangolo.com
- Next.js: https://nextjs.org/docs

### Common Commands Reference
```bash
# View all containers
docker ps -a

# Stop all containers
docker-compose -f docker-compose.production.yml down

# Remove all data (DESTRUCTIVE)
docker-compose -f docker-compose.production.yml down -v

# Rebuild from scratch
docker-compose -f docker-compose.production.yml build --no-cache

# Execute command in container
docker exec -it evconduit-backend bash
docker exec -it evconduit-frontend sh

# View environment variables
docker exec evconduit-backend env
```

---

## Changelog

### 2025-12-28 - Production Ready Release
- ✅ ES256 JWT authentication implemented
- ✅ All database tables created with RLS policies
- ✅ Fixed user["id"] → user["sub"] JWT claims (15+ instances)
- ✅ Added cryptography library permanently
- ✅ Configured all Enode environment variables
- ✅ Mock mode implementation for testing
- ✅ Redirect URI configuration fixed
- ✅ Tested end-to-end vehicle linking flow
- ⚠️ Known issue: Frontend API URL (documented workaround)

---

## License
[Your License Here]

## Contributors
[Your Name/Team]

---

**Application Status: PRODUCTION READY** ✅
