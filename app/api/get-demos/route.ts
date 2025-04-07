import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readdir, readFile } from 'fs/promises';

interface DemoInfo {
  id: string;
  title: string;
  description: string;
  hasCustomIcon: boolean;
  iconExt?: string;
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
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
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
    const excludedDemos = ['case-study', 'bmsd-case-study', 'streaming-api', 'document-chat', 'tutor-bot', 'knowledge-assistant'];
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
        
        // Look for an info file to get more metadata
        const infoPath = path.join(process.cwd(), 'data', 'demo-info', `${demoId}.json`);
        if (fs.existsSync(infoPath)) {
          try {
            const infoContent = await readFile(infoPath, 'utf-8');
            const demoInfo = JSON.parse(infoContent);
            
            // Update with additional info
            if (demoInfo.title) info.title = demoInfo.title;
            if (demoInfo.description) info.description = demoInfo.description;
          } catch (err) {
            console.error(`Error reading demo info for ${demoId}:`, err);
          }
        }
        
        // Check for icon with various extensions
        const extensions = ['.png', '.jpg', '.jpeg', '.svg'];
        for (const ext of extensions) {
          const iconPath = path.join(iconsFolder, `${demoId}${ext}`);
          if (fs.existsSync(iconPath)) {
            info.hasCustomIcon = true;
            info.iconExt = ext;
            break;
          }
        }
        
        return info;
      })
    );
    
    return NextResponse.json({ demos: demosInfo });
  } catch (error) {
    console.error('Error fetching demos:', error);
    return NextResponse.json({ error: 'Failed to fetch demos' }, { status: 500 });
  }
} 