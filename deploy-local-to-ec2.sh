#!/bin/bash

# Exit on any error
set -e

# Configuration
EC2_HOST="ec2-user@3.20.44.67"
KEY_FILE="~/Downloads/bmsd-case-demo-key.pem"
REMOTE_DIR="/home/ec2-user/demos"

# Build the project locally
echo "Building project locally..."
npm run build

# Create a temporary directory for the build
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Copy build files to temporary directory
echo "Copying build files..."
cp -r .next package.json package-lock.json next.config.js public ecosystem.config.js $TEMP_DIR/

# Properly set up standalone server with static files
echo "Configuring files for standalone mode..."
# Make sure standalone directory's public folder exists
mkdir -p $TEMP_DIR/.next/standalone/public

# Copy the public directory and its contents to standalone
cp -r $TEMP_DIR/public/* $TEMP_DIR/.next/standalone/public/

# Copy the static directory into the standalone/public/_next/static directory
mkdir -p $TEMP_DIR/.next/standalone/public/_next
cp -r $TEMP_DIR/.next/static $TEMP_DIR/.next/standalone/public/_next/

# Create the .env file in the temporary directory
echo "Creating .env file..."
cat > $TEMP_DIR/.env << EOL
# Environment Variables
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
# Add other environment variables as needed, but DO NOT include sensitive data
EOL

# Sync files to EC2
echo "Syncing files to EC2..."
rsync -avz --delete -e "ssh -i $KEY_FILE" \
    $TEMP_DIR/ \
    $EC2_HOST:$REMOTE_DIR/

# Clean up temporary directory
echo "Cleaning up..."
rm -rf $TEMP_DIR

# SSH into EC2 to install dependencies and restart the app
echo "Installing dependencies and restarting app on EC2..."
ssh -i $KEY_FILE $EC2_HOST "cd $REMOTE_DIR && npm ci && mkdir -p /home/ec2-user/demos/.next/standalone/public/_next && cp -r /home/ec2-user/demos/.next/static /home/ec2-user/demos/.next/standalone/public/_next/ && pm2 restart ecosystem.config.js"

echo "Deployment complete!" 