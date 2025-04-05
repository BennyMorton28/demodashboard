import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs';

// More robust directory creation function with validation
async function createDirectorySafely(dirPath: string): Promise<boolean> {
  try {
    console.log(`Attempting to create directory: ${dirPath}`);
    
    // First check if it already exists
    if (existsSync(dirPath)) {
      console.log(`Directory already exists: ${dirPath}`);
      return true;
    }
    
    // Otherwise create it
    await mkdir(dirPath, { recursive: true });
    
    // Verify it was created
    if (existsSync(dirPath)) {
      console.log(`Successfully created directory: ${dirPath}`);
      return true;
    } else {
      console.error(`Failed to create directory: ${dirPath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    return false;
  }
}

// Improved safe file writing function
async function writeFileSafely(filePath: string, content: string | Buffer): Promise<boolean> {
  try {
    // Ensure the directory exists first
    const dirPath = path.dirname(filePath);
    const dirCreated = await createDirectorySafely(dirPath);
    
    if (!dirCreated) {
      throw new Error(`Failed to create directory for file: ${filePath}`);
    }
    
    console.log(`Writing file to: ${filePath}`);
    await writeFile(filePath, content);
    
    // Verify the file was written
    if (existsSync(filePath)) {
      console.log(`Successfully wrote file: ${filePath}`);
      return true;
    } else {
      console.error(`Failed to write file: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

// Function to generate a unique demo ID
async function generateUniqueDemoId(baseId: string): Promise<string> {
  // Places to check for duplicates
  const placesToCheck = [
    path.join(process.cwd(), 'app', 'demos'), // Demo page directories
    path.join(process.cwd(), 'public', 'markdown'), // Markdown content directories 
    path.join(process.cwd(), 'lib', 'prompts') // Check for prompt files with the pattern {id}-prompt.md
  ];
  
  // If none of the directories exist, the ID is definitely unique
  let needsCheck = false;
  for (const dir of placesToCheck) {
    if (existsSync(dir)) {
      needsCheck = true;
      break;
    }
  }
  
  if (!needsCheck) {
    return baseId;
  }
  
  // Check if any of these locations have conflicts
  const conflicts = [];
  
  // Check demo directories
  if (existsSync(placesToCheck[0])) {
    const existingDemos = await readdir(placesToCheck[0]);
    if (existingDemos.includes(baseId)) {
      conflicts.push(baseId);
    }
  }
  
  // Check markdown directories
  if (existsSync(placesToCheck[1])) {
    const existingMarkdown = await readdir(placesToCheck[1]);
    if (existingMarkdown.includes(baseId)) {
      conflicts.push(baseId);
    }
  }
  
  // Check prompt files
  if (existsSync(placesToCheck[2])) {
    const promptFiles = await readdir(placesToCheck[2]);
    const basePromptFile = `${baseId}-prompt.md`;
    if (promptFiles.includes(basePromptFile)) {
      conflicts.push(baseId);
    }
  }
  
  // Check assistant component file
  const assistantPath = path.join(process.cwd(), 'components', `${baseId}-assistant.tsx`);
  if (existsSync(assistantPath)) {
    conflicts.push(baseId);
  }
  
  // If no conflicts, return the base ID
  if (conflicts.length === 0) {
    return baseId;
  }
  
  // Otherwise, find a unique ID by adding a suffix
  let suffix = 1;
  let newId = `${baseId}-${suffix}`;
  
  // Check if this new ID has conflicts
  while (true) {
    let hasConflict = false;
    
    // Check in demo directories
    if (existsSync(placesToCheck[0])) {
      const existingDemos = await readdir(placesToCheck[0]);
      if (existingDemos.includes(newId)) {
        hasConflict = true;
      }
    }
    
    // Check in markdown directories
    if (!hasConflict && existsSync(placesToCheck[1])) {
      const existingMarkdown = await readdir(placesToCheck[1]);
      if (existingMarkdown.includes(newId)) {
        hasConflict = true;
      }
    }
    
    // Check prompt files
    if (!hasConflict && existsSync(placesToCheck[2])) {
      const promptFiles = await readdir(placesToCheck[2]);
      const newPromptFile = `${newId}-prompt.md`;
      if (promptFiles.includes(newPromptFile)) {
        hasConflict = true;
      }
    }
    
    // Check assistant component file
    if (!hasConflict) {
      const assistantPath = path.join(process.cwd(), 'components', `${newId}-assistant.tsx`);
      if (existsSync(assistantPath)) {
        hasConflict = true;
      }
    }
    
    // If no conflicts, we've found our ID
    if (!hasConflict) {
      break;
    }
    
    // Otherwise, try the next suffix
    suffix++;
    newId = `${baseId}-${suffix}`;
  }
  
  return newId;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const password = formData.get('password');
    
    // Verify password
    if (password !== 'pickles') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get form data
    const demoTitle = formData.get('demoTitle') as string;
    const assistantTitle = formData.get('assistantTitle') as string;
    const assistantDescription = formData.get('assistantDescription') as string;
    const promptFile = formData.get('promptFile') as File;
    const contentFile = formData.get('contentFile') as File;
    const iconFile = formData.get('iconFile') as File | null;

    // Validate required fields
    if (!demoTitle || !assistantTitle || !promptFile || !contentFile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a base demo ID (lowercase, hyphenated version of the title)
    const baseId = demoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Generate a unique demo ID to avoid conflicts
    const demoId = await generateUniqueDemoId(baseId);
    console.log(`Generated demo ID: ${demoId}`);
    
    // Flag to indicate if the ID was modified
    const wasRenamed = baseId !== demoId;

    // Create all necessary parent directories first
    console.log("Creating base directories...");
    
    // 1. Create public/markdown directory structure
    const contentFolderPath = path.join(process.cwd(), 'public', 'markdown', demoId);
    const contentDirCreated = await createDirectorySafely(contentFolderPath);
    if (!contentDirCreated) {
      throw new Error(`Failed to create content directory: ${contentFolderPath}`);
    }
    
    // 2. Create lib/prompts directory structure
    const promptsDir = path.join(process.cwd(), 'lib', 'prompts');
    const promptsDirCreated = await createDirectorySafely(promptsDir);
    if (!promptsDirCreated) {
      throw new Error(`Failed to create prompts directory: ${promptsDir}`);
    }
    
    // 3. Create app/demos directory structure
    const demosDir = path.join(process.cwd(), 'app', 'demos', demoId);
    const demosDirCreated = await createDirectorySafely(demosDir);
    if (!demosDirCreated) {
      throw new Error(`Failed to create demos directory: ${demosDir}`);
    }
    
    // 4. Create components directory
    const componentsDir = path.join(process.cwd(), 'components');
    const componentsDirCreated = await createDirectorySafely(componentsDir);
    if (!componentsDirCreated) {
      throw new Error(`Failed to create components directory: ${componentsDir}`);
    }
    
    // 5. Create public/icons directory
    const iconsDir = path.join(process.cwd(), 'public', 'icons');
    const iconsDirCreated = await createDirectorySafely(iconsDir);
    if (!iconsDirCreated) {
      throw new Error(`Failed to create icons directory: ${iconsDir}`);
    }

    // Save prompt file
    const promptContent = await promptFile.text();
    const promptFilePath = path.join(process.cwd(), 'lib', 'prompts', `${demoId}-prompt.md`);
    const promptSaved = await writeFileSafely(promptFilePath, promptContent);
    if (!promptSaved) {
      throw new Error(`Failed to save prompt file: ${promptFilePath}`);
    }

    // Save icon if provided
    let iconPath = '';
    if (iconFile) {
      const iconBuffer = Buffer.from(await iconFile.arrayBuffer());
      const fileExt = path.extname(iconFile.name).toLowerCase() || '.png';
      iconPath = `/icons/${demoId}${fileExt}`;
      const iconFilePath = path.join(process.cwd(), 'public', 'icons', `${demoId}${fileExt}`);
      const iconSaved = await writeFileSafely(iconFilePath, iconBuffer);
      if (!iconSaved) {
        throw new Error(`Failed to save icon file: ${iconFilePath}`);
      }
    } else {
      // Generate a default icon with initials if no icon was uploaded
      try {
        console.log("No icon uploaded, creating default icon with initials");
        
        // Get the first two letters of the demo title
        const initials = demoTitle
          .split(' ')
          .map(part => part.charAt(0))
          .join('')
          .toUpperCase()
          .substring(0, 2);
        
        // Create a canvas to generate a simple PNG
        const { createCanvas } = require('canvas');
        const canvas = createCanvas(100, 100);
        const ctx = canvas.getContext('2d');
        
        // Draw a colored background
        ctx.fillStyle = '#f3f4f6'; // Light gray background
        ctx.fillRect(0, 0, 100, 100);
        
        // Draw the text
        ctx.font = 'bold 56px Arial';
        ctx.fillStyle = '#374151'; // Dark gray text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, 50, 50);
        
        // Save the canvas as PNG
        const buffer = canvas.toBuffer('image/png');
        const iconFilePath = path.join(process.cwd(), 'public', 'icons', `${demoId}.png`);
        const iconSaved = await writeFileSafely(iconFilePath, buffer);
        
        if (!iconSaved) {
          throw new Error(`Failed to save default icon file: ${iconFilePath}`);
        }
        
        iconPath = `/icons/${demoId}.png`;
        console.log(`Created default icon for ${demoId} with initials: ${initials}`);
      } catch (error) {
        console.error("Error creating default icon:", error);
        // Don't throw here - not having an icon is not a critical error
        // The UI will fall back to showing initials directly
      }
    }

    // Save demo content for the right side of the screen
    const contentContent = await contentFile.text();
    
    // Save content markdown to a dedicated file
    const contentFilePath = path.join(contentFolderPath, 'content.md');
    const contentSaved = await writeFileSafely(contentFilePath, contentContent);
    if (!contentSaved) {
      throw new Error(`Failed to save content file: ${contentFilePath}`);
    }
    
    // Create demo page file
    const demoPagePath = path.join(demosDir, 'page.tsx');
    const demoPageContent = generateDemoPage(demoId, demoTitle, assistantTitle);
    const demoPageSaved = await writeFileSafely(demoPagePath, demoPageContent);
    if (!demoPageSaved) {
      throw new Error(`Failed to save demo page file: ${demoPagePath}`);
    }

    // Create assistant component
    const assistantComponentPath = path.join(process.cwd(), 'components', `${demoId}-assistant.tsx`);
    const assistantComponentContent = generateAssistantComponent(demoId, assistantTitle, assistantDescription);
    const assistantSaved = await writeFileSafely(assistantComponentPath, assistantComponentContent);
    if (!assistantSaved) {
      throw new Error(`Failed to save assistant component file: ${assistantComponentPath}`);
    }

    // Add to demo info samples
    await updateDemoInfoSamples(demoId, demoTitle, contentContent);

    console.log(`Demo creation completed successfully for: ${demoId}`);
    
    // Return success response
    return NextResponse.json({
      success: true,
      demoId: demoId,
      demoPath: `/demos/${demoId}`,
      wasRenamed: wasRenamed,
      originalId: baseId,
      message: wasRenamed 
        ? `Demo created successfully with ID "${demoId}" (original ID "${baseId}" was already in use)`
        : `Demo created successfully with ID "${demoId}"`
    });
  } catch (error: any) {
    console.error('Error creating demo:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating demo' },
      { status: 500 }
    );
  }
}

// Helper to generate a demo page
function generateDemoPage(demoId: string, demoTitle: string, assistantTitle: string): string {
  const componentName = demoId.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const assistantComponentName = `${componentName}Assistant`;
  
  return `"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DemoMarkdownDisplay from "@/components/demo-markdown-display";
import ${assistantComponentName} from "@/components/${demoId}-assistant";
import DemoLayout from "@/components/demo-layout";

export default function ${componentName}Demo() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DemoLayout
      title="${demoTitle}"
      leftContent={<${assistantComponentName} />}
      rightContent={<DemoMarkdownDisplay demoId="${demoId}" />}
    />
  );
}`;
}

// Helper to generate an assistant component
function generateAssistantComponent(demoId: string, assistantTitle: string, assistantDescription: string): string {
  const welcomeMessage = `Hello! I'm ${assistantTitle}. How can I help you today?`;
  const componentName = demoId.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  
  return `"use client";
import React, { useState, useRef, useEffect } from "react";
import Chat from "./chat";
import { Item } from "@/lib/assistant";

export default function ${componentName}Assistant() {
  const [messages, setMessages] = useState<Item[]>([
    {
      type: "message",
      role: "assistant",
      id: \`initial_greeting_\${Date.now()}\`,
      content: [{ 
        type: "output_text", 
        text: "${welcomeMessage}" 
      }],
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const responseTextRef = useRef('');
  const responseIdRef = useRef(\`msg_\${Date.now()}\`);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  
  // Add a buffer and timer for smoothing out state updates
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const UPDATE_INTERVAL_MS = 50; // Update UI at most every 50ms
  const INITIAL_BUFFER_SIZE = 20; // Only start showing text once we have at least 20 chars
  const hasStartedStreamingRef = useRef(false);

  // Function to update message content with rate limiting
  const updateMessageContent = (text: string, messageId: string) => {
    const now = Date.now();
    
    // Don't display text until we have enough content to buffer
    if (!hasStartedStreamingRef.current && text.length < INITIAL_BUFFER_SIZE) {
      return; // Don't update the UI yet
    }
    
    // Once we have enough text, mark as started so future updates happen immediately
    if (!hasStartedStreamingRef.current && text.length >= INITIAL_BUFFER_SIZE) {
      hasStartedStreamingRef.current = true;
    }
    
    // If we recently updated, schedule an update for later
    if (now - lastUpdateTimeRef.current < UPDATE_INTERVAL_MS) {
      // Clear existing timeout if there is one
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
      
      // Schedule a new update
      bufferTimeoutRef.current = setTimeout(() => {
        lastUpdateTimeRef.current = Date.now();
        bufferTimeoutRef.current = null;
        
        // Do the actual update
        setMessages(prev => {
          // Create a deep copy to avoid mutation
          const newMessages = JSON.parse(JSON.stringify(prev));
          const index = newMessages.findIndex(
            (m: any) => m.type === 'message' && m.role === 'assistant' && m.id === messageId
          );
          
          if (index !== -1) {
            const assistantMessage = newMessages[index];
            if (assistantMessage.type === 'message') {
              assistantMessage.content = [{
                type: 'output_text',
                text: text
              }];
            }
          }
          
          return newMessages;
        });
      }, UPDATE_INTERVAL_MS);
    } else {
      // It's been long enough since our last update, do it immediately
      lastUpdateTimeRef.current = now;
      
      setMessages(prev => {
        // Create a deep copy to avoid mutation
        const newMessages = JSON.parse(JSON.stringify(prev));
        const index = newMessages.findIndex(
          (m: any) => m.type === 'message' && m.role === 'assistant' && m.id === messageId
        );
        
        if (index !== -1) {
          const assistantMessage = newMessages[index];
          if (assistantMessage.type === 'message') {
            assistantMessage.content = [{
              type: 'output_text',
              text: text
            }];
          }
        }
        
        return newMessages;
      });
    }
  };

  // Clean up any pending timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    };
  }, []);

  const extractDeltaText = (parsedData: any): string => {
    let deltaText = '';
    
    try {
      // Direct delta access
      if (parsedData.data?.delta) {
        deltaText = parsedData.data.delta;
        return deltaText;
      }
      
      // OpenAI event structure
      if (
        parsedData.event === 'response.output_text.delta' && 
        typeof parsedData.data === 'object'
      ) {
        if (parsedData.data.type === 'response.output_text.delta' && parsedData.data.delta) {
          deltaText = parsedData.data.delta;
          return deltaText;
        }
      }
      
      // Deep search for complex structures
      const findDelta = (obj: any): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        
        if (obj.delta) {
          return typeof obj.delta === 'string' ? obj.delta : 
                 obj.delta.value ? obj.delta.value : null;
        }
        
        for (const key in obj) {
          if (typeof obj[key] === 'object') {
            const found = findDelta(obj[key]);
            if (found) return found;
          }
        }
        
        return null;
      };
      
      if (!deltaText) {
        const foundDelta = findDelta(parsedData);
        if (foundDelta) {
          deltaText = foundDelta;
          return deltaText;
        }
      }
      
      // Error format
      if (parsedData.event === 'error' && parsedData.data?.message) {
        deltaText = \`[Error: \${parsedData.data.message}]\`;
        return deltaText;
      }
      
      return '';
    } catch (error) {
      console.error("Error extracting delta text:", error);
      return '';
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    setDebugInfo('Sending message...');

    // Create a unique ID for this message
    const messageId = \`msg_\${Date.now()}\`;

    const userItem: Item = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message.trim() }],
    };

    // Add user message to the chat
    setMessages(prev => [...prev, userItem]);

    // Create a placeholder for the assistant's response
    const assistantPlaceholder: Item = {
      id: messageId,
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: "..." }],
    };

    // Add the placeholder
    setMessages(prev => [...prev, assistantPlaceholder]);

    // Start loading state
    setIsLoading(true);
    
    // Reset streaming state
    hasStartedStreamingRef.current = false;
    
    // Reset the accumulated response text for the new message
    responseTextRef.current = '';
    responseIdRef.current = messageId;

    try {
      // Fetch API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          demoId: "${demoId}"
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      // Get a reader to read the stream
      const reader = response.body.getReader();
      let receivedLength = 0;
      const decoder = new TextDecoder();

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream complete');
          break;
        }
        
        // Process the chunk of data
        const chunk = decoder.decode(value, { stream: true });
        receivedLength += chunk.length;
        
        try {
          // Sometimes we get multiple JSON objects in one chunk, split by newlines
          const jsonChunks = chunk.split('\\n').filter(Boolean);
          
          for (const jsonChunk of jsonChunks) {
            try {
              const parsed = JSON.parse(jsonChunk);
              const deltaText = extractDeltaText(parsed);
              
              if (deltaText) {
                // Append to our accumulated text
                responseTextRef.current += deltaText;
                
                // Update the message in the UI
                updateMessageContent(responseTextRef.current, responseIdRef.current);
              }
            } catch (innerError) {
              console.error('Error parsing JSON chunk:', innerError);
              console.log('Problematic JSON chunk:', jsonChunk);
            }
          }
        } catch (parseError) {
          console.error('Error processing chunk:', parseError);
        }
      }
    } catch (error) {
      console.error('Error with fetch operation:', error);
      setDebugInfo(\`Error: \${error instanceof Error ? error.message : 'Unknown error'}\`);
      
      // Update the message with the error
      updateMessageContent(
        "I'm sorry, I encountered an error while processing your request. Please try again.",
        responseIdRef.current
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Assistant Info Header - Fixed */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">${assistantTitle}</h2>
            <p className="text-sm text-gray-600">${assistantDescription || 'Your AI Assistant'}</p>
          </div>
          {showDebug && (
            <div className="text-xs text-gray-500 mt-1 overflow-auto max-h-20 p-1 border rounded">
              {debugInfo || 'No debug info available'}
            </div>
          )}
        </div>
      </div>
      
      {/* Chat Component - Takes remaining height with proper container */}
      <div 
        className="flex-1 overflow-hidden relative" 
        style={{ 
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
      >
        <Chat 
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}`;
}

// Helper to update the demo info samples
async function updateDemoInfoSamples(demoId: string, demoTitle: string, contentMd: string) {
  try {
    // Instead of modifying the route.ts file with markdown content embedded as template literals,
    // we'll create separate markdown files and have the route.js file reference them by ID

    // 1. Create separate folders to store markdown content
    const markdownDir = path.join(process.cwd(), 'public', 'markdown');
    const demoMarkdownDir = path.join(markdownDir, demoId);
    
    // Ensure these directories exist
    const markdownDirCreated = await createDirectorySafely(markdownDir);
    if (!markdownDirCreated) {
      throw new Error(`Failed to create markdown directory: ${markdownDir}`);
    }
    
    const demoMarkdownDirCreated = await createDirectorySafely(demoMarkdownDir);
    if (!demoMarkdownDirCreated) {
      throw new Error(`Failed to create demo markdown directory: ${demoMarkdownDir}`);
    }
    
    // 2. Write the default content, prompt, and implementation sections to separate files
    // Default content (already saved to content.md in the main function)
    
    // Create a prompt-info.md file with demo prompt information
    const promptInfoContent = `# ${demoTitle} Prompt

This demo uses a custom prompt to guide its responses.`;

    const promptInfoPath = path.join(demoMarkdownDir, 'prompt-info.md');
    const promptInfoSaved = await writeFileSafely(promptInfoPath, promptInfoContent);
    if (!promptInfoSaved) {
      throw new Error(`Failed to save prompt info file: ${promptInfoPath}`);
    }
    
    // Create an implementation.md file with implementation details
    const implementationContent = `# Implementation Details

This is a customizable demo created with the demo builder.`;

    const implementationPath = path.join(demoMarkdownDir, 'implementation.md');
    const implementationSaved = await writeFileSafely(implementationPath, implementationContent);
    if (!implementationSaved) {
      throw new Error(`Failed to save implementation file: ${implementationPath}`);
    }
    
    console.log(`Successfully created markdown files for demo: ${demoId}`);
  } catch (error) {
    console.error('Error updating demo info:', error);
    throw error; // Re-throw to be handled by the caller
  }
} 