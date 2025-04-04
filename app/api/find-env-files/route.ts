import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import path from 'path';

const execPromise = promisify(exec);

export async function GET() {
  try {
    // Find all .env* files in the project directory
    const { stdout, stderr } = await execPromise('find $(pwd) -maxdepth 1 -type f -name ".env*" | sort');
    
    // Parse the output to get file paths
    const envFilePaths = stdout.split('\n').filter(line => line.trim() !== '');
    
    // Get details for each file
    const envFileDetails = await Promise.all(
      envFilePaths.map(async (filePath) => {
        try {
          // Get file name
          const fileName = path.basename(filePath);
          
          // Read file content
          const content = await readFile(filePath, 'utf8');
          
          // Extract and mask OpenAI-related variables
          const openaiApiKey = content.match(/OPENAI_API_KEY=([^\n]*)/)?.[1];
          const openaiOrgId = content.match(/OPENAI_ORG_ID=([^\n]*)/)?.[1];
          
          // Mask API key for security
          let maskedApiKey = 'Not present';
          if (openaiApiKey) {
            const prefix = openaiApiKey.substring(0, 8);
            const suffix = openaiApiKey.substring(openaiApiKey.length - 4);
            maskedApiKey = `${prefix}...${suffix} (Length: ${openaiApiKey.length})`;
          }
          
          return {
            fileName,
            filePath,
            openaiApiKey: maskedApiKey,
            openaiOrgId: openaiOrgId || 'Not present',
            lineCount: content.split('\n').length,
            fileSize: content.length,
            lastModified: new Date(parseInt((await execPromise(`stat -f %m "${filePath}"`)).stdout.trim()) * 1000).toISOString()
          };
        } catch (error: any) {
          return {
            fileName: path.basename(filePath),
            filePath,
            error: error.message
          };
        }
      })
    );
    
    return NextResponse.json({
      envFiles: envFileDetails,
      count: envFileDetails.length,
      error: stderr || undefined
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to find environment files',
      message: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    }, { status: 500 });
  }
} 