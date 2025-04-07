import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { rm } from 'fs/promises';

export async function POST(req: Request) {
  try {
    // Get the demo ID from the request
    const { demoId } = await req.json();
    
    if (!demoId) {
      return NextResponse.json(
        { error: 'Demo ID is required' },
        { status: 400 }
      );
    }

    // Prevent deletion of core demos
    const protectedDemos = ['knowledge-assistant', 'bmsd-case-study', 'kai', 'streaming-api', 'case-study'];
    if (protectedDemos.includes(demoId)) {
      return NextResponse.json(
        { error: 'Cannot delete built-in demos' },
        { status: 403 }
      );
    }

    // Define paths to delete
    const deletePromises: Promise<void>[] = [];
    const basePath = process.cwd();
    
    // 1. Delete markdown directory
    const markdownPath = path.join(basePath, 'public', 'markdown', demoId);
    if (fs.existsSync(markdownPath)) {
      console.log(`Deleting markdown directory: ${markdownPath}`);
      deletePromises.push(rm(markdownPath, { recursive: true, force: true }));
    }
    
    // 2. Delete demo page directory
    const demoPagePath = path.join(basePath, 'app', 'demos', demoId);
    if (fs.existsSync(demoPagePath)) {
      console.log(`Deleting demo page directory: ${demoPagePath}`);
      deletePromises.push(rm(demoPagePath, { recursive: true, force: true }));
    }
    
    // 3. Delete assistant component
    const assistantPath = path.join(basePath, 'components', `${demoId}-assistant.tsx`);
    if (fs.existsSync(assistantPath)) {
      console.log(`Deleting assistant component: ${assistantPath}`);
      deletePromises.push(rm(assistantPath, { force: true }));
    }
    
    // 4. Delete prompt file
    const promptPath = path.join(basePath, 'lib', 'prompts', `${demoId}-prompt.md`);
    if (fs.existsSync(promptPath)) {
      console.log(`Deleting prompt file: ${promptPath}`);
      deletePromises.push(rm(promptPath, { force: true }));
    }
    
    // 5. Delete icon
    const iconPath = path.join(basePath, 'public', 'icons', `${demoId}.png`);
    if (fs.existsSync(iconPath)) {
      console.log(`Deleting icon: ${iconPath}`);
      deletePromises.push(rm(iconPath, { force: true }));
    }
    
    // Wait for all delete operations to complete
    await Promise.all(deletePromises);
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Demo deleted successfully',
      demoId,
    });
  } catch (error) {
    console.error('Error deleting demo:', error);
    return NextResponse.json(
      { error: 'Failed to delete demo' },
      { status: 500 }
    );
  }
} 