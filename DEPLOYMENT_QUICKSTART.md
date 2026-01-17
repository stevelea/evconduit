# 🚀 EVLinkHA Deployment Quick Start

This guide will help you rename and deploy this project to your cloud server.

## 📋 Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker & Docker Compose installed
- Domain name (optional but recommended)
- Supabase account
- Stripe account (if using payments)
- Brevo/SendInBlue account (for emails)

## 🎯 Step 1: Rename the Project

Choose your new project name and run the renaming script:

```bash
# Example: Rename to "my-ev-bridge"
python3 rename_project.py --old-name evlinkha --new-name my-ev-bridge

# Or do a dry run first to see what would change
python3 rename_project.py --old-name evlinkha --new-name my-ev-bridge --dry-run
```

This will:
- ✅ Update all file contents with the new name
- ✅ Rename files and directories
- ✅ Update package.json files
- ✅ Create .env.example file

## 🔧 Step 2: Configure Environment Variables

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env and fill in your values:**
   ```bash
   nano .env
   # or
   vim .env
   ```

### Required Variables:

```bash
# Supabase (get from https://supabase.com/dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...

# Security - Generate a strong random key
INTERNAL_API_KEY=$(openssl rand -base64 32)

# API URL (update with your domain)
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com

# Email (Brevo/SendInBlue)
BREVO_API_KEY=xkeysib-...
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Project Name

# Optional: Payments (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: SMS (Twilio)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Optional: Monitoring (Sentry)
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# System
TZ=UTC  # or your timezone, e.g., America/New_York
BACKEND_PORT=9100
FRONTEND_PORT=3010
```

## 🗄️ Step 3: Set Up Supabase

1. **Create a new Supabase project** at https://supabase.com

2. **Run database migrations:**
   ```bash
   # Copy the SQL files from supabase/sql_definitions/
   # Run them in Supabase SQL Editor in order
   ```

3. **Set up authentication:**
   - Enable Email authentication
   - Configure email templates
   - Set up OAuth providers (if needed)

4. **Configure Row Level Security (RLS):**
   - Review and enable RLS policies
   - Test with a test user

5. **Get your credentials:**
   - API URL: Settings > API > Project URL
   - Anon key: Settings > API > Project API keys > anon public
   - Service role key: Settings > API > Project API keys > service_role

## 🚢 Step 4: Deploy to Server

### Option A: Using the Deployment Script (Recommended)

```bash
# Make the script executable
chmod +x deploy.sh

# Run full deployment
./deploy.sh deploy
```

The script will:
1. Check prerequisites
2. Verify environment variables
3. Build Docker images
4. Start containers
5. Run health checks
6. Test endpoints

### Option B: Manual Deployment

```bash
# Build images
docker-compose -f docker-compose.production.yml build

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

## 🌐 Step 5: Configure DNS & SSL

### DNS Configuration

Point your domain to your server's IP:

```
A     yourdomain.com        -> YOUR_SERVER_IP
A     api.yourdomain.com    -> YOUR_SERVER_IP
CNAME www.yourdomain.com    -> yourdomain.com
```

### SSL Certificates (Let's Encrypt)

```bash
# Using the deploy script
./deploy.sh setup-ssl

# Or manually
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d api.yourdomain.com \
  --email your@email.com \
  --agree-tos
```

### Nginx Reverse Proxy

Create `/etc/nginx/sites-available/your-project`:

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:9100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/your-project /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 📊 Step 6: Verify Deployment

### Check Service Health

```bash
# Using the deploy script
./deploy.sh status
./deploy.sh test

# Or manually
curl https://api.yourdomain.com/docs
curl https://yourdomain.com
```

### Monitor Logs

```bash
# Using the deploy script
./deploy.sh logs

# Or manually
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
```

## 🔄 Ongoing Operations

### Update Application

```bash
# Pull latest changes and redeploy
./deploy.sh update
```

### Restart Services

```bash
./deploy.sh restart
```

### Create Backup

```bash
./deploy.sh backup
```

### Rollback

```bash
./deploy.sh rollback
```

## 🐛 Troubleshooting

### Backend Not Starting

1. **Check logs:**
   ```bash
   docker logs evlinkha-backend
   ```

2. **Common issues:**
   - Invalid Supabase credentials
   - Missing environment variables
   - Port 9100 already in use

### Frontend Not Starting

1. **Check logs:**
   ```bash
   docker logs evlinkha-frontend
   ```

2. **Common issues:**
   - Backend not healthy
   - Invalid API URL
   - Port 3010 already in use

### Database Connection Issues

1. **Verify Supabase URL and keys**
2. **Check RLS policies**
3. **Review Supabase logs**

### SSL Certificate Issues

```bash
# Renew certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

## 📚 Additional Resources

- [Full Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Docker Documentation](https://docs.docker.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `./deploy.sh logs`
2. Verify environment variables in `.env`
3. Ensure all external services are configured
4. Review the troubleshooting section
5. Check Supabase dashboard for database issues

## 📝 Post-Deployment Checklist

- [ ] Backend API accessible at api.yourdomain.com/docs
- [ ] Frontend accessible at yourdomain.com
- [ ] SSL certificates working
- [ ] Database connections working
- [ ] Email sending working
- [ ] Authentication flows working
- [ ] Stripe webhooks configured (if using payments)
- [ ] Sentry receiving errors (if configured)
- [ ] Backups scheduled
- [ ] Monitoring alerts set up
- [ ] DNS propagated globally
- [ ] All environment variables secured

---

## 🎉 Success!

Your application should now be running. Access it at:

- **Frontend**: https://yourdomain.com
- **Backend API**: https://api.yourdomain.com/docs
- **Supabase Dashboard**: https://supabase.com/dashboard

Monitor your application and iterate as needed. Good luck! 🚀
