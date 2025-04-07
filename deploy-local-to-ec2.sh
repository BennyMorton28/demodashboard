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
cp -r .next package.json package-lock.json next.config.js public $TEMP_DIR/

# Create the .env file in the temporary directory
echo "Creating .env file..."
cat > $TEMP_DIR/.env << EOL
# Environment Variables
NODE_ENV=production
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

echo "Deployment complete!" 