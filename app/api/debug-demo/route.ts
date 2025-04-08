import { NextRequest, NextResponse } from 'next/server';
import { demoLogger } from '@/lib/debug-utils';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// API route to provide debugging information about demos
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const demoId = url.searchParams.get('id');
    const includeData = url.searchParams.get('includeData') === 'true';
    
    // Validate we have a demo ID
    if (!demoId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }
    
    // Log the request
    demoLogger.info(`Debug request for demo: ${demoId}`, { includeData });
    
    // Information to collect about the demo
    const baseDir = process.cwd();
    const debugInfo: any = {
      demoId,
      timestamp: new Date().toISOString(),
      paths: {
        componentFile: path.join(baseDir, 'components', `${demoId}-assistant.tsx`),
        promptFile: path.join(baseDir, 'lib', 'prompts', `${demoId}-prompt.md`),
        contentDir: path.join(baseDir, 'public', 'markdown', demoId),
        contentFile: path.join(baseDir, 'public', 'markdown', demoId, 'content.md'),
        demoInfoFile: path.join(baseDir, 'data', 'demo-info', `${demoId}.json`),
        demoPage: path.join(baseDir, 'app', 'demos', demoId, 'page.tsx'),
      },
      exists: {}
    };
    
    // Check if each file exists
    for (const [key, filePath] of Object.entries(debugInfo.paths)) {
      debugInfo.exists[key] = existsSync(filePath as string);
    }
    
    // Include file data if requested
    if (includeData) {
      debugInfo.data = {};
      
      // Only read files that exist
      for (const [key, filePath] of Object.entries(debugInfo.paths)) {
        if (debugInfo.exists[key]) {
          try {
            // Read file content
            const content = await fs.readFile(filePath as string, 'utf-8');
            
            // For JSON files, parse the content
            if ((filePath as string).endsWith('.json')) {
              try {
                debugInfo.data[key] = JSON.parse(content);
              } catch {
                // If parsing fails, just include the raw content
                debugInfo.data[key] = content;
              }
            } else {
              // For non-JSON files, include the content as is (truncate if it's too long)
              const maxLength = 2000; // Max characters to include
              if (content.length > maxLength) {
                debugInfo.data[key] = content.substring(0, maxLength) + '... [truncated]';
              } else {
                debugInfo.data[key] = content;
              }
            }
          } catch (error) {
            debugInfo.data[key] = `Error reading file: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
      }
    }
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    demoLogger.error('Error in debug-demo API route', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 