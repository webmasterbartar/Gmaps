#!/bin/bash

# Google Maps Scraper - Server Installation Script
# For Ubuntu/Debian servers

set -e

echo "=========================================="
echo "Google Maps Scraper - Server Setup"
echo "=========================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update

# Install Node.js 18+
echo "📦 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✓ Node.js already installed"
fi

node --version
npm --version

# Install MongoDB
echo "📦 Installing MongoDB..."
if ! command -v mongod &> /dev/null; then
    # Import MongoDB public key
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

    # Create list file
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

    # Update and install
    sudo apt-get update
    sudo apt-get install -y mongodb-org

    # Start MongoDB
    sudo systemctl start mongod
    sudo systemctl enable mongod
else
    echo "✓ MongoDB already installed"
fi

sudo systemctl status mongod --no-pager

# Install PM2 for process management
echo "📦 Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
else
    echo "✓ PM2 already installed"
fi

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✓ .env created - Please edit it with your settings"
else
    echo "✓ .env already exists"
fi

# Create data directory
echo "📁 Creating data directory..."
mkdir -p data
chmod 755 data

echo ""
echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file: nano .env"
echo "2. Add your queries: nano queries.txt"
echo "3. Start scraper: pm2 start index.js --name google-maps-scraper"
echo "4. View logs: pm2 logs google-maps-scraper"
echo "5. Monitor: pm2 monit"
echo ""
echo "PM2 useful commands:"
echo "  pm2 list          - List all processes"
echo "  pm2 stop 0        - Stop process"
echo "  pm2 restart 0     - Restart process"
echo "  pm2 delete 0      - Delete process"
echo "  pm2 save          - Save current process list"
echo ""
