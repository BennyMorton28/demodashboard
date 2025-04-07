import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

export async function POST(req: Request) {
  try {
    // Get the demo ID and updated information from the request
    const { demoId, title, description } = await req.json();
    
    if (!demoId || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update the metadata file or create if it doesn't exist
    const metadataDir = path.join(process.cwd(), 'public', 'markdown', demoId);
    const metadataPath = path.join(metadataDir, 'metadata.json');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }
    
    // Read existing metadata or create new
    let metadata = {
      title,
      description,
      updatedAt: new Date().toISOString(),
    };
    
    if (fs.existsSync(metadataPath)) {
      try {
        const existingData = await readFile(metadataPath, 'utf-8');
        const existingMetadata = JSON.parse(existingData);
        metadata = {
          ...existingMetadata,
          title,
          description,
          updatedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error reading existing metadata:', error);
        // Continue with new metadata if read fails
      }
    }
    
    // Write the updated metadata
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Demo updated successfully',
      demoId,
      title,
      description,
    });
  } catch (error) {
    console.error('Error updating demo:', error);
    return NextResponse.json(
      { error: 'Failed to update demo' },
      { status: 500 }
    );
  }
} 