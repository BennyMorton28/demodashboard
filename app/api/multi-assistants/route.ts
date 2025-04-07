import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(request: NextRequest) {
  try {
    // Get the demo ID from the query parameters
    const { searchParams } = new URL(request.url);
    const demoId = searchParams.get('demoId');

    if (!demoId) {
      return NextResponse.json(
        { error: 'Missing required parameter: demoId' },
        { status: 400 }
      );
    }

    // Path to the assistants configuration file
    const configDir = path.join(process.cwd(), 'data', 'multi-assistants');
    const configPath = path.join(configDir, `${demoId}.json`);

    // Check if configuration file exists
    if (!existsSync(configPath)) {
      return NextResponse.json(
        { error: 'Demo configuration not found' },
        { status: 404 }
      );
    }

    // Read and parse the configuration file
    const fileContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(fileContent);

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error in GET /api/multi-assistants:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 