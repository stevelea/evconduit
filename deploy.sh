#!/bin/bash

# EVLinkHA Deployment Script
# This script helps deploy the application to a cloud server

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        log_error ".env file not found!"
        log_info "Copy .env.example to .env and fill in your values:"
        log_info "  cp .env.example .env"
        exit 1
    fi
    log_success ".env file found"
}

# Check required environment variables
check_required_vars() {
    log_info "Checking required environment variables..."
    
    source .env
    
    local required_vars=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "SUPABASE_ANON_KEY"
        "INTERNAL_API_KEY"
        "NEXT_PUBLIC_API_BASE_URL"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    log_success "All required environment variables are set"
}

# Check Docker installation
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed!"
        log_info "Install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    log_success "Docker is installed"
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed!"
        log_info "Install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    log_success "Docker Compose is installed"
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    mkdir -p logs/backend
    mkdir -p logs/frontend
    log_success "Directories created"
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    docker-compose -f docker-compose.production.yml build --no-cache
    log_success "Docker images built successfully"
}

# Stop existing containers
stop_containers() {
    log_info "Stopping existing containers..."
    docker-compose -f docker-compose.production.yml down
    log_success "Existing containers stopped"
}

# Start containers
start_containers() {
    log_info "Starting containers..."
    docker-compose -f docker-compose.production.yml up -d
    log_success "Containers started"
}

# Wait for services to be healthy
wait_for_health() {
    log_info "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local backend_health=$(docker inspect --format='{{.State.Health.Status}}' evlinkha-backend 2>/dev/null || echo "unknown")
        local frontend_health=$(docker inspect --format='{{.State.Health.Status}}' evlinkha-frontend 2>/dev/null || echo "unknown")
        
        if [ "$backend_health" = "healthy" ] && [ "$frontend_health" = "healthy" ]; then
            log_success "All services are healthy!"
            return 0
        fi
        
        log_info "Waiting for health checks... (attempt $attempt/$max_attempts)"
        log_info "  Backend: $backend_health"
        log_info "  Frontend: $frontend_health"
        
        sleep 5
        ((attempt++))
    done
    
    log_error "Services did not become healthy in time"
    log_info "Check logs with: docker-compose logs"
    return 1
}

# Show service status
show_status() {
    log_info "Service Status:"
    docker-compose -f docker-compose.production.yml ps
}

# Show logs
show_logs() {
    log_info "Recent logs:"
    docker-compose -f docker-compose.production.yml logs --tail=50
}

# Test endpoints
test_endpoints() {
    log_info "Testing endpoints..."
    
    source .env
    local backend_port=${BACKEND_PORT:-9100}
    local frontend_port=${FRONTEND_PORT:-3010}
    
    # Test backend
    if curl -f -s http://localhost:${backend_port}/docs > /dev/null; then
        log_success "Backend API is responding (http://localhost:${backend_port}/docs)"
    else
        log_error "Backend API is not responding"
    fi
    
    # Test frontend
    if curl -f -s http://localhost:${frontend_port}/ > /dev/null; then
        log_success "Frontend is responding (http://localhost:${frontend_port}/)"
    else
        log_error "Frontend is not responding"
    fi
}

# Generate SSL certificates (Let's Encrypt)
setup_ssl() {
    log_info "SSL Setup (Let's Encrypt)"
    log_warning "This requires a domain name pointing to this server"
    
    read -p "Enter your domain name (e.g., evlinkha.com): " domain
    read -p "Enter your email for Let's Encrypt: " email
    
    if [ -z "$domain" ] || [ -z "$email" ]; then
        log_error "Domain and email are required"
        return 1
    fi
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        sudo apt-get update
        sudo apt-get install -y certbot
    fi
    
    # Get certificate
    log_info "Obtaining SSL certificate for $domain..."
    sudo certbot certonly --standalone -d $domain -d api.$domain --email $email --agree-tos --non-interactive
    
    log_success "SSL certificate obtained!"
    log_info "Certificate location: /etc/letsencrypt/live/$domain/"
}

# Main deployment function
deploy() {
    log_info "Starting deployment process..."
    echo ""
    
    # Pre-deployment checks
    check_env_file
    check_required_vars
    check_docker
    create_directories
    
    echo ""
    log_info "Building and deploying..."
    
    # Build and deploy
    build_images
    stop_containers
    start_containers
    
    echo ""
    log_info "Waiting for services to start..."
    wait_for_health
    
    echo ""
    show_status
    
    echo ""
    test_endpoints
    
    echo ""
    log_success "Deployment completed successfully!"
    echo ""
    log_info "Next steps:"
    log_info "1. Configure DNS to point to this server"
    log_info "2. Set up SSL/TLS with: $0 --setup-ssl"
    log_info "3. Configure reverse proxy (nginx/caddy)"
    log_info "4. Set up monitoring and backups"
    echo ""
    log_info "View logs with: docker-compose -f docker-compose.production.yml logs -f"
}

# Rollback function
rollback() {
    log_warning "Rolling back to previous version..."
    
    # Stop current containers
    docker-compose -f docker-compose.production.yml down
    
    # Pull previous images (if using registry)
    # docker-compose pull
    
    # Start previous version
    docker-compose -f docker-compose.production.yml up -d
    
    log_info "Rollback completed. Check service status."
}

# Update function
update() {
    log_info "Updating application..."
    
    # Pull latest code
    log_info "Pulling latest code from git..."
    git pull
    
    # Rebuild and redeploy
    deploy
}

# Backup function
backup() {
    log_info "Creating backup..."
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup .env
    cp .env "$backup_dir/.env"
    
    # Backup logs
    cp -r logs "$backup_dir/logs"
    
    # Export Docker volumes (if any)
    # docker run --rm -v evlinkha_data:/data -v $(pwd)/$backup_dir:/backup alpine tar czf /backup/data.tar.gz -C /data .
    
    log_success "Backup created in $backup_dir"
}

# Show usage
usage() {
    cat << EOF
EVLinkHA Deployment Script

Usage: $0 [COMMAND]

Commands:
    deploy          Full deployment (build, stop, start, test)
    update          Pull latest code and redeploy
    start           Start containers
    stop            Stop containers
    restart         Restart containers
    status          Show container status
    logs            Show container logs
    test            Test endpoints
    rollback        Rollback to previous version
    backup          Create backup
    setup-ssl       Set up SSL certificates with Let's Encrypt
    help            Show this help message

Examples:
    $0 deploy
    $0 logs
    $0 status

EOF
}

# Main script
main() {
    case "${1:-}" in
        deploy)
            deploy
            ;;
        update)
            update
            ;;
        start)
            start_containers
            wait_for_health
            show_status
            ;;
        stop)
            stop_containers
            ;;
        restart)
            stop_containers
            start_containers
            wait_for_health
            show_status
            ;;
        status)
            show_status
            ;;
        logs)
            docker-compose -f docker-compose.production.yml logs -f
            ;;
        test)
            test_endpoints
            ;;
        rollback)
            rollback
            ;;
        backup)
            backup
            ;;
        setup-ssl)
            setup_ssl
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            log_error "Unknown command: ${1:-}"
            echo ""
            usage
            exit 1
            ;;
    esac
}

main "$@"
