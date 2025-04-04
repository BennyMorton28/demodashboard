import { NextResponse } from 'next/server';

// Helper function to mask sensitive values
function maskSensitiveValue(value: string | undefined): string {
  if (!value) return 'Not set';
  if (value.length < 10) return `${value.substring(0, 3)}...`;
  
  const prefix = value.substring(0, 8);
  const suffix = value.substring(value.length - 4);
  return `${prefix}...${suffix} (Length: ${value.length})`;
}

export async function GET() {
  // Collect and mask environment variables
  const envInfo = {
    // OpenAI related
    OPENAI_API_KEY: maskSensitiveValue(process.env.OPENAI_API_KEY),
    OPENAI_ORG_ID: process.env.OPENAI_ORG_ID || 'Not set',
    
    // Node environment info
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID,
    
    // Paths and environment files
    PWD: process.env.PWD, // Current working directory
    HOME: process.env.HOME, // Home directory
    
    // Process information
    PID: process.pid,
    PPID: process.ppid,
    
    // Environment file paths that Next.js would load
    // (These values don't exist in process.env but are informative)
    potentialEnvFiles: [
      '.env',
      '.env.local',
      '.env.development',
      '.env.development.local'
    ].map(file => `${process.cwd()}/${file}`),
    
    // Express the timestamp when this info was generated
    timestamp: new Date().toISOString()
  };
  
  console.log('Debug Environment Variables:', JSON.stringify(envInfo, null, 2));
  
  return NextResponse.json(envInfo);
} 