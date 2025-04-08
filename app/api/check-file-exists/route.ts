import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(req: NextRequest) {
  try {
    // Get the file path from the query string
    const url = new URL(req.url);
    const filePath = url.searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ exists: false, error: 'No path provided' }, { status: 400 });
    }
    
    // For security, validate that the path doesn't try to access anything outside the project
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return NextResponse.json({ exists: false, error: 'Invalid path' }, { status: 400 });
    }
    
    // Construct the absolute path to the file
    const absolutePath = path.join(process.cwd(), filePath);
    
    // Check if the file exists
    const exists = fs.existsSync(absolutePath);
    
    console.log(`[CHECK-FILE] Checking if file exists: ${filePath}, result: ${exists}`);
    
    // Return the result
    return NextResponse.json({ exists, path: filePath });
  } catch (error) {
    console.error('[CHECK-FILE] Error checking file existence:', error);
    return NextResponse.json({ exists: false, error: 'Server error' }, { status: 500 });
  }
} 