#!/bin/bash

# Script to deploy KAI streaming fixes

echo "Deploying KAI streaming fixes..."

# Run the deployment script
./deploy-local-to-ec2.sh

echo "Restarting the application on EC2..."
ssh ec2-user@ec2-instance-hostname "cd /path/to/app && npm run restart"

echo "Testing the deployment..."
curl -v "https://your-domain.com/api/test-kai" > /dev/null

echo "KAI streaming fixes deployed successfully!"
echo "Test the streaming implementation by visiting https://your-domain.com/demos/kai and using the Test Streaming button in the debug panel." 