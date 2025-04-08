#!/bin/bash

# Script to check logs on the EC2 server
# Usage: ./check-logs.sh search_term

if [ -z "$1" ]; then
  echo "Please provide a search term"
  echo "Usage: ./check-logs.sh search_term"
  exit 1
fi

SEARCH_TERM="$1"
echo "Checking logs for: $SEARCH_TERM"

# Execute the deployment script with the log check command
./deploy-local-to-ec2.sh "grep -i \"$SEARCH_TERM\" /home/ubuntu/demodashboard/logs/combined.log || echo 'No matches found'; echo \"Checking PM2 logs...\"; pm2 logs --lines 100 | grep -i \"$SEARCH_TERM\" || echo 'No matches found in PM2 logs'" 