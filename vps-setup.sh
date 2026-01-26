#!/bin/bash
# VPS Initial Setup Script for Hetzner
# Run this script on your VPS the first time to prepare it for deployments

set -e

echo "🚀 Setting up VPS for QR Adhesiones deployment..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed successfully"
else
    echo "✅ Docker Compose already installed"
fi

# Verify installations
echo "🔍 Verifying installations..."
docker --version
docker-compose --version

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /srv/qr-adhesiones
cd /srv/qr-adhesiones
echo "✅ Directory created at /srv/qr-adhesiones"

# Configure firewall
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp      # SSH
    ufw allow 80/tcp      # HTTP
    ufw allow 443/tcp     # HTTPS
    ufw status
    echo "✅ Firewall configured"
else
    echo "⚠️  UFW not found, skipping firewall configuration"
fi

# Setup SSH key for GitHub Actions
echo "🔑 Setting up SSH for GitHub Actions..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add the public key for GitHub Actions
if ! grep -q "seiji-github-actions" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGwUPCZfnNsocdS7O0LMjTS4u/ABzOYDUpsvQjKQwidzseiji-github-actions" >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
    echo "✅ SSH key added"
else
    echo "✅ SSH key already exists"
fi

# Install additional useful tools
echo "🛠️  Installing additional tools..."
apt install -y git curl wget nano htop

echo ""
echo "✨ VPS setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Configure GitHub Secrets in your repository"
echo "2. Push to main branch to trigger deployment"
echo "3. Monitor deployment at: https://github.com/ssasakiseiji/qr-adhesiones/actions"
echo ""
echo "📍 Application directory: /srv/qr-adhesiones"
echo "🌐 Access your app at: http://$(curl -s ifconfig.me)"
echo ""
