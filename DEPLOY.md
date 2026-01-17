# 🚀 EVConduit - Ready for Deployment

This is your **renamed and ready-to-deploy** EVConduit repository!

## ✅ What's Been Done

- ✅ **Project renamed** from EVLinkHA to EVConduit
- ✅ **All references updated** across 73 files
- ✅ **Proper branding** with "EVConduit" (EV capitalized)
- ✅ **Package names updated** (frontend, root package.json)
- ✅ **.env.example created** with all required variables
- ✅ **Deployment tools included** (deploy.sh, docker-compose.production.yml)
- ✅ **Documentation added** (deployment guides)

## 📦 What's Included

### Application Code
- `backend/` - FastAPI backend (renamed to EVConduit)
- `frontend/` - Next.js frontend (renamed to evconduit-frontend)
- `supabase/` - Database schemas and migrations

### Deployment Tools
- `deploy.sh` - Automated deployment script ⭐
- `docker-compose.production.yml` - Production Docker config
- `docker-compose.yml` - Original Docker config (updated)
- `rename_project.py` - Project renaming tool (if you need it again)

### Documentation
- `README.md` - Project overview
- `DEPLOYMENT_QUICKSTART.md` - Step-by-step deployment guide ⭐
- `DEPLOYMENT_GUIDE.md` - Comprehensive reference
- `.env.example` - Environment variable template

## 🚀 Quick Deploy (3 Steps)

### 1. Configure Environment
```bash
# Copy and edit environment variables
cp .env.example .env
nano .env

# Required variables:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY  
# - SUPABASE_ANON_KEY
# - INTERNAL_API_KEY (generate: openssl rand -base64 32)
# - NEXT_PUBLIC_API_BASE_URL
# - BREVO_API_KEY
# - FROM_EMAIL
# - FROM_NAME
```

### 2. Set Up Supabase
1. Create project at https://supabase.com
2. Run SQL migrations from `supabase/sql_definitions/`
3. Get your API keys and URL
4. Add them to `.env`

### 3. Deploy!
```bash
# Make deploy script executable (if needed)
chmod +x deploy.sh

# Deploy everything
./deploy.sh deploy
```

That's it! Your EVConduit application will be running.

## 📚 Detailed Documentation

**Start here**: `DEPLOYMENT_QUICKSTART.md` - Complete step-by-step guide

**For reference**: `DEPLOYMENT_GUIDE.md` - All environment variables, options, troubleshooting

## 🔧 Deployment Script Commands

```bash
./deploy.sh deploy      # Full deployment
./deploy.sh start       # Start containers
./deploy.sh stop        # Stop containers
./deploy.sh restart     # Restart containers
./deploy.sh status      # Check status
./deploy.sh logs        # View logs
./deploy.sh test        # Test endpoints
./deploy.sh backup      # Create backup
./deploy.sh rollback    # Rollback changes
./deploy.sh setup-ssl   # Set up SSL certificates
```

## 🌐 What You Need

### External Services
- **Supabase** - Database & Authentication (required)
- **Brevo** - Email sending (required)
- **Stripe** - Payments (optional)
- **Twilio** - SMS (optional)
- **Sentry** - Error tracking (optional)

### Server Requirements
- Linux server (Ubuntu 20.04+)
- 2GB+ RAM
- 20GB+ disk space
- Docker & Docker Compose
- Domain name (recommended)

## 🎯 Architecture

```
┌─────────────────┐
│  EVConduit      │
│  Frontend       │  Next.js 15 (React 19)
│  Port: 3010     │  TypeScript, Tailwind
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  EVConduit      │  FastAPI (Python)
│  Backend API    │  Async, Pydantic
│  Port: 9100     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │  PostgreSQL
│  (External)     │  Auth, Storage
└─────────────────┘
```

## 🔐 Environment Variables

All configured in `.env` file:

**Required:**
- Supabase credentials (URL, keys)
- Internal API key
- Email service (Brevo)
- API base URL

**Optional:**
- Stripe (payments)
- Twilio (SMS)
- Sentry (monitoring)

See `.env.example` for complete list.

## 📝 Next Steps

1. **Review the code** - Familiarize yourself with the structure
2. **Configure .env** - Add your credentials
3. **Set up Supabase** - Run migrations, configure auth
4. **Deploy locally first** - Test before going to production
5. **Deploy to cloud** - Use the deployment script
6. **Configure DNS** - Point your domain to the server
7. **Set up SSL** - Use Let's Encrypt (automated in script)
8. **Monitor** - Check logs, set up monitoring

## 🆘 Troubleshooting

### Containers won't start
```bash
# Check logs
./deploy.sh logs

# Check Docker
docker ps
docker logs evconduit-backend
docker logs evconduit-frontend
```

### Database connection issues
- Verify Supabase URL and keys in `.env`
- Check Supabase dashboard for connection status
- Review Row Level Security policies

### Port conflicts
```bash
# Check what's using ports
sudo lsof -i :9100
sudo lsof -i :3010

# Change ports in .env
BACKEND_PORT=9101
FRONTEND_PORT=3011
```

## 📞 Support

- **Documentation**: See `DEPLOYMENT_QUICKSTART.md` and `DEPLOYMENT_GUIDE.md`
- **Logs**: `./deploy.sh logs`
- **Status**: `./deploy.sh status`
- **Original project**: https://github.com/stevelea/evlink-backend

## ⚡ Quick Reference

### Service URLs (after deployment)
- Frontend: http://localhost:3010 (or https://yourdomain.com)
- Backend API: http://localhost:9100/docs (or https://api.yourdomain.com/docs)

### Key Files
- `.env` - Your configuration (NEVER commit to git!)
- `docker-compose.production.yml` - Production deployment config
- `deploy.sh` - Deployment automation
- `backend/app/` - Backend application code
- `frontend/src/` - Frontend application code

### Logs Location
- Backend logs: `logs/backend/`
- Frontend logs: `logs/frontend/`
- Docker logs: `docker logs <container-name>`

## 🎉 Ready to Deploy!

You have everything you need to deploy EVConduit to your cloud server.

Start with **DEPLOYMENT_QUICKSTART.md** for step-by-step instructions.

Good luck! 🚀

---

**EVConduit** - Open-source EV ↔ Home Assistant bridge
