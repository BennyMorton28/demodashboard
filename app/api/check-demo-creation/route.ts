import { NextRequest, NextResponse } from 'next/server';
import { validateDemoCreation, analyzeDirectoryStructure, demoLogger } from '@/lib/debug-utils';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Define the shape of the file check result
interface FileCheckResult {
  exists: boolean;
  path?: string;
}

// Extended interface for file content check result
interface ContentCheckResult extends FileCheckResult {
  valid: boolean;
  error?: string;
}

// Interface for all details returned
interface DemoCheckDetails {
  [key: string]: FileCheckResult | ContentCheckResult;
}

// API route to check if demo creation was successful and report issues
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const demoId = searchParams.get('id');
  const includeStructure = searchParams.get('includeStructure') === 'true';
  
  if (!demoId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Missing demo ID parameter' 
    }, { status: 400 });
  }
  
  console.log(`[check-demo-creation] Checking files for demo: ${demoId}`);
  
  try {
    // Define the paths we expect to exist for a properly created demo
    const expectedPaths = {
      'demoDirectory': path.join(process.cwd(), 'public', 'demos', demoId),
      'demoImageFile': path.join(process.cwd(), 'public', 'demos', demoId, 'demo-image.png'),
      'demoDataFile': path.join(process.cwd(), 'public', 'demos', demoId, 'demo-data.json'),
      'demoConfigFile': path.join(process.cwd(), 'public', 'demos', demoId, 'config.json'),
      'demoPageFile': path.join(process.cwd(), 'app', 'demos', demoId, 'page.tsx'),
    };
    
    // Check each path and build result object
    const details: DemoCheckDetails = {};
    
    for (const [key, filePath] of Object.entries(expectedPaths)) {
      const exists = existsSync(filePath);
      details[key] = { 
        exists,
        path: includeStructure ? filePath : undefined
      };
      
      console.log(`[check-demo-creation] ${key}: ${exists ? 'EXISTS' : 'MISSING'} - ${filePath}`);
    }
    
    // Overall success is true if all paths exist
    const success = Object.values(details).every(item => item.exists);
    
    // Check demo data content if it exists
    let demoData = null;
    const demoDataFile = expectedPaths.demoDataFile;
    
    if (details.demoDataFile.exists) {
      try {
        const content = await fs.readFile(demoDataFile, 'utf8');
        demoData = JSON.parse(content);
        details.demoDataContent = { 
          exists: true, 
          path: includeStructure ? demoDataFile : undefined,
          valid: true
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[check-demo-creation] Error reading/parsing demo data: ${errorMessage}`);
        details.demoDataContent = { 
          exists: true, 
          path: includeStructure ? demoDataFile : undefined,
          valid: false,
          error: errorMessage
        };
      }
    }
    
    return NextResponse.json({
      success,
      details,
      demoData: includeStructure ? demoData : undefined
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[check-demo-creation] Error checking demo: ${errorMessage}`);
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 