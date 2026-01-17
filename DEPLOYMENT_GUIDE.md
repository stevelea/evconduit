# EVLinkHA Deployment Preparation Guide

## 🎯 Pre-Deployment Checklist

### 1. **Choose Your New Project Name**
Before we proceed, decide on a new name for the project:
- [ ] Choose new project name (e.g., `my-ev-bridge`, `homeassistant-ev-link`, etc.)
- [ ] Check domain availability for your project
- [ ] Verify Docker Hub / Container Registry naming

---

## 📋 Files That Need Renaming

### Core Configuration Files
1. **docker-compose.yml** - Service configurations
2. **frontend/package.json** - Project name
3. **README.md** - Project references
4. **evlink-backend.code-workspace** - VS Code workspace

### Documentation Files
- All `.md` files in `/docs` folder
- GitHub workflows (if keeping CI/CD)
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md

### Environment References
- `.env.example` - Create this based on docker-compose.yml
- Backend configuration files
- Frontend environment variables

---

## 🔧 Required Environment Variables

### Backend Service
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Internal Security
INTERNAL_API_KEY=generate_strong_random_key

# Email (Brevo)
BREVO_API_KEY=your_brevo_api_key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Project Name

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring (Sentry)
SENTRY_DSN=https://...@sentry.io/...

# System
PYTHONUNBUFFERED=1
TZ=your_timezone  # e.g., America/New_York, Europe/London
```

### Frontend Service
```bash
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
TZ=your_timezone

# Sentry (Frontend)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

## 🚀 Deployment Options

### Option 1: Docker Compose (Recommended for VPS)
- ✅ Simple setup
- ✅ Good for single-server deployments
- ✅ Easy scaling with Docker Swarm

### Option 2: Kubernetes
- ✅ Advanced orchestration
- ✅ Multi-node deployments
- ⚠️ More complex setup

### Option 3: Platform-as-a-Service
- **Coolify** (mentioned in docker-compose.yml)
- **Railway**
- **Render**
- **Fly.io**

### Option 4: Cloud Provider VMs
- AWS EC2
- Google Compute Engine
- DigitalOcean Droplets
- Linode/Akamai

---

## 🔐 Security Checklist

- [ ] Generate strong random keys for `INTERNAL_API_KEY`
- [ ] Set up SSL/TLS certificates (Let's Encrypt)
- [ ] Configure firewall rules
- [ ] Set up Supabase Row Level Security (RLS)
- [ ] Review and update CORS settings
- [ ] Enable Sentry error tracking
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Review and update authentication flows
- [ ] Set up monitoring and alerts

---

## 📦 Pre-Deployment Setup Steps

### 1. Supabase Setup
```bash
# 1. Create new Supabase project at https://supabase.com
# 2. Run migrations from /supabase/sql_definitions/
# 3. Set up Row Level Security policies
# 4. Configure Auth providers
# 5. Get API keys and URL
```

### 2. Stripe Setup (if using payments)
```bash
# 1. Create Stripe account
# 2. Get API keys (test and live)
# 3. Set up products and pricing
# 4. Configure webhooks
# 5. Test payment flows
```

### 3. Email Setup (Brevo/SendInBlue)
```bash
# 1. Create Brevo account
# 2. Verify domain
# 3. Create API key
# 4. Set up email templates
```

### 4. SMS Setup (Twilio)
```bash
# 1. Create Twilio account
# 2. Get phone number
# 3. Get Account SID and Auth Token
# 4. Test SMS sending
```

### 5. Domain & DNS Setup
```bash
# Main domain
yourdomain.com → Frontend
api.yourdomain.com → Backend

# Required DNS records
A     yourdomain.com         → Your_Server_IP
A     api.yourdomain.com     → Your_Server_IP
CNAME www.yourdomain.com     → yourdomain.com
```

---

## 🔨 Build & Deploy Process

### 1. Local Testing
```bash
# Test backend
cd backend
python -m uvicorn app.main:app --reload

# Test frontend
cd frontend
npm install
npm run dev
```

### 2. Docker Build
```bash
# Build backend
docker build -t your-project-backend:latest ./backend

# Build frontend
docker build -t your-project-frontend:latest ./frontend

# Or use docker-compose
docker-compose build
```

### 3. Deploy
```bash
# Using docker-compose
docker-compose up -d

# Or deploy to container registry
docker push your-registry/your-project-backend:latest
docker push your-registry/your-project-frontend:latest
```

---

## 🔍 Health Checks & Monitoring

### Backend Health Check
```bash
curl http://localhost:9100/docs
curl http://localhost:9100/health  # Add if not exists
```

### Frontend Health Check
```bash
curl http://localhost:3010/
```

### Container Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## 📊 Post-Deployment Verification

- [ ] Backend API accessible at api.yourdomain.com/docs
- [ ] Frontend accessible at yourdomain.com
- [ ] SSL certificates working
- [ ] Database connections working
- [ ] Email sending working
- [ ] SMS sending working
- [ ] Stripe webhooks receiving events
- [ ] Sentry receiving errors
- [ ] Logs being generated properly
- [ ] Health checks passing
- [ ] Rate limiting working
- [ ] Authentication flows working

---

## 🛠️ Maintenance Tasks

### Regular Updates
```bash
# Pull latest code
git pull

# Rebuild containers
docker-compose build --no-cache

# Deploy with zero downtime
docker-compose up -d --no-deps --build backend
docker-compose up -d --no-deps --build frontend
```

### Database Backups
```bash
# Automated Supabase backups (configured in Supabase dashboard)
# Additional manual backup script can be added
```

### Log Rotation
```bash
# Configure Docker log rotation
# /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

---

## 🚨 Troubleshooting

### Backend Not Starting
1. Check logs: `docker-compose logs backend`
2. Verify environment variables
3. Check Supabase connectivity
4. Verify port 9100 not in use

### Frontend Not Starting
1. Check logs: `docker-compose logs frontend`
2. Verify NEXT_PUBLIC_API_BASE_URL
3. Ensure backend is healthy
4. Check port 3010 not in use

### Database Connection Issues
1. Verify Supabase URL and keys
2. Check network connectivity
3. Review Supabase logs
4. Verify RLS policies

---

## 📞 Support & Resources

- Original project: https://github.com/stevelea/evlink-backend
- Supabase docs: https://supabase.com/docs
- FastAPI docs: https://fastapi.tiangolo.com
- Next.js docs: https://nextjs.org/docs
- Docker docs: https://docs.docker.com

---

## Next Steps

1. Choose your new project name
2. Run the renaming script (I'll create this for you)
3. Set up external services (Supabase, Stripe, etc.)
4. Configure environment variables
5. Test locally with docker-compose
6. Deploy to your cloud server
7. Configure DNS and SSL
8. Monitor and maintain

Ready to proceed? Let me know your new project name and I'll help you with the renaming!
