# Docker Setup Guide

This guide will help you set up and run the Meme Bot Flip in a Docker container for improved security.

## Why Docker?

Running the bot in Docker provides several security benefits:
1. Isolation from your host system
2. Limited access to system resources
3. Easy cleanup if something goes wrong
4. Consistent environment across different machines

## Prerequisites

1. Install Docker Desktop:
   - [Windows](https://www.docker.com/products/docker-desktop)
   - [Mac](https://www.docker.com/products/docker-desktop)
   - [Linux](https://docs.docker.com/engine/install/)

2. Verify Docker installation:
```bash
docker --version
```

## Pre-Setup: Backup Your Data

Before setting up Docker, backup your existing data:
```bash
# Create backup directory
mkdir -p backups/$(date +%Y-%m-%d)

# Backup trade logs
cp src/data/trade_log.csv backups/$(date +%Y-%m-%d)/

# Backup system logs
cp -r src/data/logs backups/$(date +%Y-%m-%d)/

# Backup .env file (securely)
cp .env backups/$(date +%Y-%m-%d)/.env.backup
```

## Setup Steps

1. Create a Dockerfile in your project root:
```dockerfile
# Use Node.js LTS version
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Create data directories
RUN mkdir -p src/data/logs src/data/models src/data/repositories

# Set environment variables
ENV NODE_ENV=production

# Start the bot
CMD [ "npm", "start" ]
```

2. Create a docker-compose.yml file:
```yaml
version: '3'
services:
  bot:
    build: .
    container_name: meme-bot-flip
    volumes:
      # Mount data directories for persistence
      - ./src/data:/usr/src/app/src/data:rw
      # Mount .env file read-only
      - ./.env:/usr/src/app/.env:ro
    restart: unless-stopped
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
    # Health check
    healthcheck:
      test: ["CMD", "node", "src/scripts/healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
```

3. Build and run the container:
```bash
# Build the container
docker-compose build

# Start the container
docker-compose up -d

# View logs
docker-compose logs -f
```

## Security Considerations

1. **Volume Mounts**:
   - `./src/data:/usr/src/app/src/data:rw` - Read-write access for data persistence
   - `./.env:/usr/src/app/.env:ro` - Read-only access for configuration
   - No other directories are mounted for security

2. **Resource Limits**:
   - CPU limited to 1 core
   - Memory limited to 1GB
   - Prevents resource exhaustion attacks

3. **Network Isolation**:
   - Container runs in isolated network
   - No inbound ports exposed
   - Only outbound connections to Solana network allowed

## Managing the Container

```bash
# Stop the bot
docker-compose down

# Restart the bot
docker-compose restart

# View container status
docker-compose ps

# Access container shell (if needed)
docker-compose exec bot sh
```

## Monitoring

1. **Container Resources**:
```bash
# View resource usage
docker stats meme-bot-flip
```

2. **Logs**:
```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f
```

3. **Health Checks**:
```bash
# View health status
docker inspect --format='{{.State.Health.Status}}' meme-bot-flip
```

## Troubleshooting

1. **Permission Issues**:
```bash
# Fix volume permissions
docker-compose down
sudo chown -R $USER:$USER src/data
docker-compose up -d
```

2. **Container Won't Start**:
```bash
# Check container logs
docker-compose logs

# Remove and rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

3. **Health Check Failures**:
```bash
# Check health check logs
docker inspect meme-bot-flip | jq '.[].State.Health.Log'
```

## Cleanup

To completely remove the container and its data:
```bash
# Stop and remove container
docker-compose down

# Remove volumes (if needed)
docker-compose down -v

# Remove images
docker rmi meme-bot-flip
```

## Important Notes

1. Always backup your data before Docker setup
2. Monitor container resource usage
3. Keep Docker and the container image updated
4. Use a dedicated wallet for bot operations
5. Start with small amounts to test the setup 