#!/bin/bash

# Script to check if specific files exist for a demo on the EC2 server
# Usage: ./check-demo-files.sh demo_id

if [ -z "$1" ]; then
  echo "Please provide a demo_id"
  echo "Usage: ./check-demo-files.sh demo_id"
  exit 1
fi

DEMO_ID="$1"
echo "Checking files for demo: $DEMO_ID"

# Execute the deployment script with the file check command
./deploy-local-to-ec2.sh "echo \"Checking demo files for $DEMO_ID...\"; \
echo \"Checking page.tsx...\"; \
ls -la /home/ubuntu/demodashboard/app/demos/$DEMO_ID/page.tsx 2>/dev/null || echo \"❌ page.tsx not found\"; \
echo \"Checking create-success directory...\"; \
ls -la /home/ubuntu/demodashboard/app/demos/$DEMO_ID/create-success 2>/dev/null || echo \"❌ create-success directory not found\"; \
echo \"Checking component file...\"; \
ls -la /home/ubuntu/demodashboard/components/$DEMO_ID-assistant.tsx 2>/dev/null || echo \"❌ component file not found\"; \
echo \"Checking prompt file...\"; \
ls -la /home/ubuntu/demodashboard/lib/prompts/$DEMO_ID-prompt.md 2>/dev/null || echo \"❌ prompt file not found\"; \
echo \"Checking markdown directory...\"; \
ls -la /home/ubuntu/demodashboard/public/markdown/$DEMO_ID 2>/dev/null || echo \"❌ markdown directory not found\"; \
echo \"Checking metadata file...\"; \
ls -la /home/ubuntu/demodashboard/data/demo-info/$DEMO_ID.json 2>/dev/null || echo \"❌ metadata file not found\"; \
echo \"Checking icon file...\"; \
ls -la /home/ubuntu/demodashboard/public/icons/$DEMO_ID.* 2>/dev/null || echo \"❌ icon file not found\";" 