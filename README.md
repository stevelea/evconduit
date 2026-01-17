# EVConduit

**Production-ready EV management platform with Enode integration**

[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

## Overview

EVConduit is a full-stack application for managing electric vehicles through the Enode API. It features:

- 🔐 Secure authentication with Supabase (ES256 JWT)
- 🚗 Vehicle linking and management via Enode
- 📊 Real-time vehicle data and status
- 💳 Stripe subscription management
- 📧 Email notifications (Brevo)
- 📱 SMS notifications (Twilio)
- 🐳 Docker-based deployment
- 🏠 Home Assistant integration ready

## Features

### Core Functionality
- **Vehicle Management**: Link and manage multiple EVs from various manufacturers
- **Real-time Data**: Access vehicle location, battery status, charging state
- **Remote Control**: Start/stop charging, set climate controls
- **Multi-tier System**: Free, Basic, and Pro subscription tiers
- **Admin Dashboard**: Comprehensive admin panel for user and vehicle management

### Technical Highlights
- FastAPI backend with async support
- Next.js 15 frontend with TypeScript
- PostgreSQL database via Supabase
- Row Level Security (RLS) policies
- ES256 JWT authentication
- Docker Compose deployment
- Comprehensive error handling and logging

## Quick Start
```bash
# Clone repository
git clone <your-repo-url>
cd evconduit-ready-to-deploy

# Configure environment
cp .env.example .env
nano .env

# Setup database (see docs/DEPLOYMENT_GUIDE.md)

# Deploy
docker-compose -f docker-compose.production.yml up -d

# Verify
curl http://localhost:9100/api/ping
open http://localhost:3010
```

**See [Quick Start Guide](docs/QUICK_START.md) for detailed setup instructions.**

## Documentation

- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Quick Start](docs/QUICK_START.md)** - 5-minute setup guide
- **[Database Schema](docs/database/)** - SQL scripts and schema documentation
- **[API Documentation](http://localhost:9100/docs)** - Interactive API docs (when running)

## Architecture
```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Frontend  │────▶│   Backend    │────▶│  Supabase  │
│  (Next.js)  │     │  (FastAPI)   │     │    (DB)    │
│  Port 3010  │     │  Port 9100   │     └────────────┘
└─────────────┘     └──────────────┘            │
                           │                     │
                           │                     │
                    ┌──────▼──────┐       ┌─────▼─────┐
                    │    Enode    │       │   Auth    │
                    │  (Vehicle)  │       │  (ES256)  │
                    └─────────────┘       └───────────┘
```

## Tech Stack

**Backend:**
- Python 3.12
- FastAPI
- Supabase Python Client
- httpx (async HTTP)
- cryptography (ES256 JWT)

**Frontend:**
- Next.js 15
- TypeScript
- React
- Tailwind CSS

**Infrastructure:**
- Docker & Docker Compose
- Supabase (PostgreSQL)
- Enode API

**Optional Services:**
- Stripe (payments)
- Brevo (email)
- Twilio (SMS)
- Sentry (error tracking)

## Environment Variables

Key configuration variables (see `.env.example` for complete list):
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_KEY=your-key

# Enode
ENODE_CLIENT_ID=your-id
ENODE_CLIENT_SECRET=your-secret
ENODE_BASE_URL=https://enode-api.sandbox.enode.io

# Frontend
NEXT_PUBLIC_API_BASE_URL=http://your-domain:9100
```

## Database Schema

Core tables:
- `users` - User accounts and subscription tiers
- `vehicles` - Linked vehicles and cached data
- `settings` - Application settings and rate limits
- `subscriptions` - Stripe subscription data
- `api_telemetry` - API usage logging

**Run the master schema:** `docs/database/00_master_schema_setup_fixed.sql`

## API Endpoints

**Public:**
- `GET /api/ping` - Health check
- `GET /docs` - Interactive API documentation

**Private (requires auth):**
- `GET /api/me` - Current user info
- `GET /api/user/vehicles` - List linked vehicles
- `POST /api/user/link-vehicle` - Create vehicle link session
- `POST /api/user/unlink` - Unlink vehicle

**Admin:**
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/{id}` - Update user
- `GET /api/admin/vehicles` - List all vehicles

## Development
```bash
# Install dependencies
cd backend && pip install -r requirements.txt
cd frontend && npm install

# Run locally (development mode)
docker-compose up

# Run tests
cd backend && pytest
```

## Testing

**Enode Sandbox Test Credentials:**
- Email: `9e26f1b8@sandbox.enode.com`
- Password: `5872c471`

Use these to test vehicle linking in sandbox mode.

## Deployment

### Production Checklist
- [ ] Update `.env` with production credentials
- [ ] Switch Enode to production mode
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall (allow ports 9100, 3010)
- [ ] Set up domain/DNS
- [ ] Enable monitoring
- [ ] Configure backups
- [ ] Test end-to-end flows

### Docker Deployment
```bash
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

## Monitoring
```bash
# View logs
docker logs evconduit-backend -f
docker logs evconduit-frontend -f

# Check container status
docker ps

# Restart services
docker-compose -f docker-compose.production.yml restart
```

## Known Issues

1. **Frontend API URL**: Unlink button calls wrong port
   - **Workaround**: Delete vehicles from Supabase dashboard
   - **Fix**: Rebuild frontend with correct `NEXT_PUBLIC_API_BASE_URL`

2. **Background Telemetry Errors**: Non-critical, doesn't affect functionality
   - Missing `cost_tokens` column in api_telemetry (optional feature)

See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md#known-issues--fixes) for details.

## Security

- ES256 JWT authentication
- Row Level Security (RLS) on all tables
- Environment-based secrets
- CORS configuration
- Rate limiting per tier
- SQL injection protection

**Never commit `.env` to version control!**

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

[Your License Here]

## Support

- 📧 Email: your-email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 📚 Docs: [Documentation](docs/)

## Acknowledgments

- [Enode](https://enode.com) - Vehicle API provider
- [Supabase](https://supabase.com) - Backend infrastructure
- [FastAPI](https://fastapi.tiangolo.com) - Backend framework
- [Next.js](https://nextjs.org) - Frontend framework

---

**Status:** Production Ready ✅

Last Updated: 2025-12-28
