# LogoGen Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- API key for image generation service (e.g., x.ai Grok Vision)
- At least 1GB RAM and 2GB disk space

## Production Deployment

### 1. Server Setup

Clone the repository:
```bash
git clone https://github.com/enu235/LogoGen.git
cd LogoGen
```

### 2. Configuration

Create production environment file:
```bash
cp .env.example .env
```

Edit `.env` with your production values:
```bash
# Required
API_KEY=your_production_api_key
API_BASE_URL=https://api.x.ai/v1
MODEL_NAME=grok-vision-beta

# Optional customization
PORT=3000
NODE_ENV=production
LOGO_SIZE=1024
ICON_SIZE=64
MAX_FILE_SIZE=10485760
```

### 3. Deploy with Docker Compose

**Option A: Filesystem Storage (Recommended)**

Create required directories for persistent storage:
```bash
mkdir -p public/generated temp
```

Start the application:
```bash
docker-compose up -d
```

**Option B: Docker Volumes**

Use Docker volumes instead of bind mounts:
```bash
docker-compose -f docker-compose.volumes.yml up -d
```

Check status:
```bash
docker-compose ps
docker-compose logs -f logogen
```

### 4. Verify Deployment

Test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

Open in browser:
```
http://your-server-ip:3000
```

## Nginx Reverse Proxy (Optional)

If you want to serve on port 80/443 with SSL:

1. Install Nginx
2. Create configuration file `/etc/nginx/sites-available/logogen`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Serve generated images directly
    location /generated/ {
        alias /path/to/LogoGen/public/generated/;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

3. Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/logogen /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Environment Variables Reference

### Required
- `API_KEY`: Your image generation API key

### Optional
- `API_BASE_URL`: API endpoint (default: https://api.x.ai/v1)
- `MODEL_NAME`: Model name (default: grok-vision-beta)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `LOGO_SIZE`: Logo output size in pixels (default: 1024)
- `ICON_SIZE`: Icon output size in pixels (default: 64)
- `MAX_FILE_SIZE`: Maximum file size in bytes (default: 10MB)

## Monitoring

### Health Checks

The application provides a health endpoint:
```bash
curl http://localhost:3000/api/health
```

### Docker Health Checks

Docker Compose includes automatic health checks:
```bash
docker-compose ps  # Shows health status
```

### Logs

View application logs:
```bash
docker-compose logs -f logogen
```

### Resource Usage

Monitor resource usage:
```bash
docker stats logogen_logogen_1
```

## Backup and Maintenance

### Backup Generated Images

**For Filesystem Storage (default):**
Images are stored directly on the local filesystem. To backup:
```bash
# Simple tar backup
tar czf images-backup-$(date +%Y%m%d).tar.gz public/generated/

# Or copy to backup location
cp -r public/generated/ /path/to/backup/location/
```

**For Docker Volumes:**
If using `docker-compose.volumes.yml`, backup the Docker volume:
```bash
docker run --rm -v logogen_generated_images:/data -v $(pwd):/backup alpine tar czf /backup/images-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### Clean Up Old Images

**For Filesystem Storage:**
Remove images older than 30 days:
```bash
find public/generated -name "*.png" -mtime +30 -delete
```

**For Docker Volumes:**
```bash
docker exec logogen_logogen_1 find /app/public/generated -name "*.png" -mtime +30 -delete
```

### Update Application

```bash
git pull
docker-compose down
docker-compose up --build -d
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   docker-compose logs logogen
   # Check for API key configuration errors
   ```

2. **API errors**
   - Verify API_KEY is correct
   - Check API_BASE_URL endpoint
   - Ensure sufficient API credits

3. **Out of disk space**
   ```bash
   df -h
   docker system prune  # Clean up unused containers/images
   ```

4. **Memory issues**
   ```bash
   docker stats
   # Consider increasing memory limits in docker-compose.yml
   ```

### Performance Tuning

For high-traffic deployments:

1. **Increase memory limits** in `docker-compose.yml`
2. **Use Redis for caching** (add Redis service)
3. **Load balancer** for multiple instances
4. **CDN** for serving generated images

## Security Considerations

1. **API Key Security**
   - Never commit `.env` to version control
   - Use Docker secrets in production
   - Rotate API keys regularly

2. **File System Security**
   - Generated images are world-readable
   - Consider implementing authentication
   - Regular cleanup of old files

3. **Network Security**
   - Use HTTPS in production
   - Implement rate limiting
   - Consider firewall rules

## Scaling

For larger deployments:

1. **Multiple instances** with load balancer
2. **Shared storage** for generated images (NFS/S3)
3. **Database** for metadata storage
4. **Queue system** for background processing
