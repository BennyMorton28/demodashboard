#!/bin/bash

# Exit on any error
set -e

# Configuration
EC2_HOST="ec2-user@3.20.44.67"
KEY_FILE="~/Downloads/bmsd-case-demo-key.pem"
REMOTE_DIR="/home/ec2-user/demos"
APP_NAME="demodashboard"

echo "Starting deployment to EC2..."

# SSH into EC2 and deploy
ssh -i $KEY_FILE $EC2_HOST << 'ENDSSH'
  cd $REMOTE_DIR

  # Install dependencies if needed
  echo "Installing dependencies..."
  npm install

  # Create or update PM2 process
  echo "Updating PM2 process..."
  pm2 delete $APP_NAME 2>/dev/null || true
  
  # Start the application with PM2
  echo "Starting application with PM2..."
  NODE_ENV=production pm2 start npm --name "$APP_NAME" -- start
  pm2 save

  echo "Deployment completed successfully!"
ENDSSH

echo "Deployment process finished!" 