# EVConduit Quick Start Guide

## 5-Minute Setup

### 1. Prerequisites Check
```bash
docker --version  # Should be 20.10+
docker-compose --version  # Should be 1.29+
```

### 2. Clone & Configure
```bash
git clone <your-repo>
cd evconduit-ready-to-deploy
cp .env.example .env
nano .env  # Fill in your credentials
```

### 3. Database Setup
1. Go to Supabase Dashboard → SQL Editor
2. Paste contents of `docs/database/00_master_schema_setup_fixed.sql`
3. Click "Run"
4. Update admin user (see DEPLOYMENT_GUIDE.md)

### 4. Deploy
```bash
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

### 5. Verify
```bash
# Backend health
curl http://localhost:9100/api/ping

# Frontend
open http://localhost:3010
```

### 6. Test Vehicle Linking (Sandbox)
1. Navigate to http://localhost:3010/dashboard
2. Click "Link Vehicle" → Select "XPENG"
3. Use test credentials:
   - Email: `9e26f1b8@sandbox.enode.com`
   - Password: `5872c471`
4. Complete authorization
5. Vehicle appears in dashboard ✅

## Production Checklist
- [ ] Update all `localhost` to actual domain
- [ ] Switch Enode from sandbox to production
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Set up monitoring
- [ ] Test with real vehicle

## Need Help?
See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.
