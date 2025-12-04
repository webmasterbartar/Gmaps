#!/bin/bash

# Google Maps Scraper - CentOS/RHEL Installation Script

set -e

echo "=========================================="
echo "Google Maps Scraper - CentOS Server Setup"
echo "=========================================="

# Detect package manager
if command -v dnf &> /dev/null; then
    PKG_MGR="dnf"
else
    PKG_MGR="yum"
fi

echo "📦 Using package manager: $PKG_MGR"

# Update system
echo "📦 Updating system packages..."
$PKG_MGR update -y

# Install Node.js 18+
echo "📦 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    $PKG_MGR install -y nodejs
else
    echo "✓ Node.js already installed"
fi

node --version
npm --version

# Install MongoDB
echo "📦 Installing MongoDB..."
if ! command -v mongod &> /dev/null; then
    # Create MongoDB repository file
    cat > /etc/yum.repos.d/mongodb-org-7.0.repo <<EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF

    # Install MongoDB
    $PKG_MGR install -y mongodb-org

    # Start MongoDB
    systemctl start mongod
    systemctl enable mongod
else
    echo "✓ MongoDB already installed"
fi

systemctl status mongod --no-pager || true

# Install required dependencies for Puppeteer/Chrome
echo "📦 Installing Chrome dependencies..."
$PKG_MGR install -y \
    alsa-lib \
    atk \
    cups-libs \
    gtk3 \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi \
    xorg-x11-fonts-cyrillic \
    xorg-x11-fonts-misc \
    xorg-x11-fonts-Type1 \
    xorg-x11-utils \
    nss \
    nspr \
    libxshmfence

# Install PM2 for process management
echo "📦 Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
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
echo "   (Set HEADLESS=true for server)"
echo "2. Add your queries: nano queries.txt"
echo "3. Start scraper: pm2 start index.js --name gmaps-scraper"
echo "4. View logs: pm2 logs gmaps-scraper"
echo "5. Monitor: pm2 monit"
echo ""
echo "Useful commands:"
echo "  pm2 list          - List all processes"
echo "  pm2 stop 0        - Stop process"
echo "  pm2 restart 0     - Restart process"
echo "  pm2 logs 0        - View logs"
echo "  pm2 save          - Save process list"
echo "  pm2 startup       - Auto-start on reboot"
echo ""
