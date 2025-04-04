import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function GET() {
  try {
    // Check for environment variables in the shell environment
    const { stdout, stderr } = await execPromise('printenv | grep -E "OPENAI|NODE_ENV"');
    
    // Parse the output to create an object
    const envVars = stdout.split('\n')
      .filter(line => line.trim() !== '')
      .reduce((acc, line) => {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('='); // Handle values that might contain =
        
        if (key.includes('OPENAI_API_KEY') && value) {
          // Mask API key for security
          const prefix = value.substring(0, 8);
          const suffix = value.substring(value.length - 4);
          acc[key] = `${prefix}...${suffix} (Length: ${value.length})`;
        } else {
          acc[key] = value;
        }
        
        return acc;
      }, {} as Record<string, string>);
    
    return NextResponse.json({
      systemEnvVars: envVars,
      error: stderr || undefined
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to check system environment variables',
      message: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    }, { status: 500 });
  }
} 