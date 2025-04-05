import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readdir, readFile } from 'fs/promises';

interface DemoInfo {
  id: string;
  title: string;
  description: string;
  hasCustomIcon: boolean;
}

export async function GET() {
  try {
    // Directories to scan for demo IDs
    const demoFolders = path.join(process.cwd(), 'app', 'demos');
    const markdownFolders = path.join(process.cwd(), 'public', 'markdown');
    const iconsFolder = path.join(process.cwd(), 'public', 'icons');
    
    const demos = new Set<string>();
    
    // Scan demo folders
    if (fs.existsSync(demoFolders)) {
      const entries = await readdir(demoFolders, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'streaming-api' && !entry.name.startsWith('.')) {
          demos.add(entry.name);
        }
      }
    }
    
    // Scan markdown folders (for content)
    if (fs.existsSync(markdownFolders)) {
      const entries = await readdir(markdownFolders, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          demos.add(entry.name);
        }
      }
    }
    
    // Filter out some internal or special demos that shouldn't be listed
    const excludedDemos = ['case-study', 'bmsd-case-study', 'streaming-api'];
    const demoIds = Array.from(demos).filter(demo => !excludedDemos.includes(demo));
    
    // Get additional metadata for each demo
    const demosInfo: DemoInfo[] = await Promise.all(
      demoIds.map(async (demoId) => {
        // Default info
        let info: DemoInfo = {
          id: demoId,
          title: demoId.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
          description: "Custom demo created with the demo builder.",
          hasCustomIcon: false
        };
        
        // Check if we have a metadata.json file
        const metadataPath = path.join(markdownFolders, demoId, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          try {
            const metadataContent = await readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(metadataContent);
            
            // Update with metadata if available
            if (metadata.title) info.title = metadata.title;
            if (metadata.description) info.description = metadata.description;
          } catch (err) {
            console.error(`Error reading metadata for ${demoId}:`, err);
          }
        }
        
        // Check if the demo has a custom icon
        const iconPath = path.join(iconsFolder, `${demoId}.png`);
        info.hasCustomIcon = fs.existsSync(iconPath);
        
        return info;
      })
    );
    
    return NextResponse.json({ demos: demosInfo });
  } catch (error) {
    console.error('Error fetching demos:', error);
    return NextResponse.json({ error: 'Failed to fetch demos' }, { status: 500 });
  }
} 