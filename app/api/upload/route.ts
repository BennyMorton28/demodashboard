import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs';

// Enhanced logging helper
function logDebug(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  
  if (data) {
    try {
      // Try to stringify the data if it's an object
      if (typeof data === 'object') {
        // Special handling for errors
        if (data instanceof Error) {
          console.log(`[${timestamp}] Error details:`, {
            message: data.message,
            stack: data.stack,
            name: data.name
          });
        } else {
          console.log(`[${timestamp}] Data:`, JSON.stringify(data, null, 2));
        }
      } else {
        console.log(`[${timestamp}] Data:`, data);
      }
    } catch (err) {
      console.log(`[${timestamp}] Failed to stringify data:`, String(err));
      console.log(`[${timestamp}] Original data:`, data);
    }
  }
}

// More robust directory creation function with validation
async function createDirectorySafely(dirPath: string): Promise<boolean> {
  try {
    logDebug(`Attempting to create directory: ${dirPath}`);
    
    // First check if it already exists
    if (existsSync(dirPath)) {
      logDebug(`Directory already exists: ${dirPath}`);
      
      // Additional diagnostics - check if it's readable and writable
      try {
        const stats = fs.statSync(dirPath);
        logDebug(`Directory stats:`, {
          isDirectory: stats.isDirectory(),
          mode: stats.mode.toString(8),
          uid: stats.uid,
          gid: stats.gid,
          size: stats.size,
          atime: stats.atime,
          mtime: stats.mtime,
          ctime: stats.ctime
        });
        
        // Test write access by trying to create a temporary file
        const testFilePath = path.join(dirPath, `.test-${Date.now()}.tmp`);
        try {
          fs.writeFileSync(testFilePath, 'test');
          fs.unlinkSync(testFilePath); // Clean up
          logDebug(`Directory is writable: ${dirPath}`);
        } catch (writeError) {
          logDebug(`Directory exists but is not writable: ${dirPath}`, writeError);
          // We'll continue since the directory exists, but log the warning
        }
      } catch (statError) {
        logDebug(`Directory exists but cannot read stats: ${dirPath}`, statError);
        // Continue anyway since the directory exists
      }
      
      return true;
    }
    
    // Otherwise create it
    await mkdir(dirPath, { recursive: true });
    
    // Verify it was created
    if (existsSync(dirPath)) {
      logDebug(`Successfully created directory: ${dirPath}`);
      return true;
    } else {
      logDebug(`Failed to create directory: ${dirPath} (exists check failed after creation)`);
      return false;
    }
  } catch (error) {
    logDebug(`Error creating directory ${dirPath}:`, error);
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
      logDebug(`Failed to create directory for file: ${filePath}`);
      throw new Error(`Failed to create directory for file: ${filePath}`);
    }
    
    logDebug(`Writing file to: ${filePath} (${typeof content === 'string' ? content.length : content.byteLength} bytes)`);
    
    try {
      await writeFile(filePath, content);
    } catch (writeError) {
      logDebug(`Error during writeFile operation:`, writeError);
      
      // Try a fallback approach with fs.writeFileSync
      logDebug(`Attempting fallback with fs.writeFileSync`);
      fs.writeFileSync(filePath, content);
      logDebug(`Fallback write succeeded`);
    }
    
    // Verify the file was written
    if (existsSync(filePath)) {
      try {
        const stats = fs.statSync(filePath);
        const expectedSize = typeof content === 'string' ? Buffer.byteLength(content) : content.byteLength;
        if (stats.size === 0 && expectedSize > 0) {
          logDebug(`Warning: File was created but has zero size: ${filePath}`);
          // Try writing again with sync method
          fs.writeFileSync(filePath, content);
          
          const statsAfterRetry = fs.statSync(filePath);
          if (statsAfterRetry.size === 0) {
            logDebug(`File still has zero size after retry: ${filePath}`);
            return false;
          } else {
            logDebug(`Retry succeeded, file size now: ${statsAfterRetry.size} bytes`);
          }
        }
        
        logDebug(`Successfully wrote file: ${filePath} (${stats.size} bytes)`);
        return true;
      } catch (statError) {
        logDebug(`Error checking written file stats: ${filePath}`, statError);
        return existsSync(filePath); // Return true if file exists, even if we can't get stats
      }
    } else {
      logDebug(`Failed to write file: ${filePath} (file does not exist after write)`);
      return false;
    }
  } catch (error) {
    logDebug(`Error writing file ${filePath}:`, error);
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

export const config = {
  api: {
    // Use default JSON body parser
    bodyParser: {
      sizeLimit: '50mb', // Allow up to 50MB for the total payload
    },
    responseLimit: '50mb',
  },
};

// Interface for file data in the request
interface FileData {
  name: string;
  type: string;
  size: number;
  content: string; // Base64 encoded content
}

// Interface for the full request payload
interface UploadPayload {
  password: string;
  demoTitle: string;
  assistantTitle: string;
  assistantDescription: string;
  promptFile: FileData | null;
  contentFile: FileData | null;
  iconFile: FileData | null;
}

export async function POST(req: NextRequest) {
  try {
    console.log("Upload route hit");
    const formData = await req.formData();
    
    console.log("Form data received, keys:", Array.from(formData.keys()));
    
    // Validate required fields
    const demoTitle = formData.get("demoTitle") as string;
    const assistantTitle = formData.get("assistantTitle") as string;
    const promptFile = formData.get("promptFile");
    const contentFile = formData.get("contentFile");
    
    if (!demoTitle) {
      return NextResponse.json({ error: "Demo title is required" }, { status: 400 });
    }
    
    if (!assistantTitle) {
      return NextResponse.json({ error: "Assistant title is required" }, { status: 400 });
    }
    
    // Check if the files exist and are not string (they should be Blob/File objects)
    if (!promptFile || typeof promptFile === 'string') {
      return NextResponse.json({ error: "Prompt file is required" }, { status: 400 });
    }
    
    if (!contentFile || typeof contentFile === 'string') {
      return NextResponse.json({ error: "Content file is required" }, { status: 400 });
    }
    
    // Now we know these are Blob objects with text method and name property
    const promptFileObj = promptFile as unknown as { name: string, text: () => Promise<string> };
    const contentFileObj = contentFile as unknown as { name: string, text: () => Promise<string> };
    
    console.log("Files received:", { 
      promptFile: promptFileObj.name,
      contentFile: contentFileObj.name
    });

    // Generate demo ID and folder structures
    const demoId = await generateUniqueDemoId(demoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    const demoPath = `/demos/${demoId}`;
    
    // Create necessary directories
    const markdownDir = path.join(process.cwd(), "public/markdown", demoId);
    await createDirectorySafely(markdownDir);
    
    // Save the prompt file
    try {
      const promptContent = await promptFileObj.text();
      const promptPath = path.join(process.cwd(), "lib/prompts", `${demoId}-prompt.md`);
      await writeFileSafely(promptPath, promptContent);
      console.log("Prompt file saved to", promptPath);
    } catch (err) {
      console.error("Error saving prompt file:", err);
      return NextResponse.json({ error: "Failed to save prompt file" }, { status: 500 });
    }
    
    // Save the content file
    let contentContent = "";
    try {
      contentContent = await contentFileObj.text();
      const contentPath = path.join(markdownDir, "content.md");
      await writeFileSafely(contentPath, contentContent);
      console.log("Content file saved to", contentPath);
    } catch (err) {
      console.error("Error saving content file:", err);
      return NextResponse.json({ error: "Failed to save content file" }, { status: 500 });
    }

    // Process icon (optional)
    const iconFile = formData.get("iconFile");
    let iconPath = "";
    
    if (iconFile && typeof iconFile !== 'string') {
      try {
        const iconFileObj = iconFile as unknown as { 
          name: string, 
          arrayBuffer: () => Promise<ArrayBuffer> 
        };
        
        const buffer = Buffer.from(await iconFileObj.arrayBuffer());
        const fileExt = path.extname(iconFileObj.name) || ".png";
        iconPath = `/icons/${demoId}${fileExt}`;
        
        const fullIconPath = path.join(process.cwd(), "public", iconPath);
        await writeFileSafely(fullIconPath, buffer);
        console.log("Icon saved to", fullIconPath);
      } catch (err) {
        console.error("Error processing icon:", err);
        // Continue without icon
        iconPath = "";
      }
    } else {
      // Generate default icon with initials
      try {
        const initials = demoTitle
          .split(" ")
          .slice(0, 2)
          .map(word => word[0])
          .join("")
          .toUpperCase();
        
        const { createCanvas } = require("canvas");
        const canvas = createCanvas(200, 200);
        const ctx = canvas.getContext("2d");
        
        ctx.fillStyle = "#f3f4f6";
        ctx.fillRect(0, 0, 200, 200);
        
        ctx.fillStyle = "#4b5563";
        ctx.font = "bold 80px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials, 100, 100);
        
        const buffer = canvas.toBuffer("image/png");
        iconPath = `/icons/${demoId}.png`;
        
        const fullIconPath = path.join(process.cwd(), "public", iconPath);
        await writeFileSafely(fullIconPath, buffer);
        console.log("Default icon generated and saved to", fullIconPath);
      } catch (err) {
        console.error("Error generating default icon:", err);
      }
    }

    // Create demo page file
    const demoDirPath = path.join(process.cwd(), 'app/demos', demoId);
    await createDirectorySafely(demoDirPath);
    
    const demoPagePath = path.join(demoDirPath, 'page.tsx');
    const demoPageContent = generateDemoPage(demoId, demoTitle, assistantTitle);
    await writeFileSafely(demoPagePath, demoPageContent);
    console.log("Demo page created at", demoPagePath);

    // Create assistant component
    const assistantComponentPath = path.join(process.cwd(), 'components', `${demoId}-assistant.tsx`);
    const assistantComponentContent = generateAssistantComponent(demoId, assistantTitle);
    await writeFileSafely(assistantComponentPath, assistantComponentContent);
    console.log("Assistant component created at", assistantComponentPath);
    
    // Create markdown documentation files
    const promptInfoPath = path.join(markdownDir, 'prompt-info.md');
    const promptInfoContent = `# ${demoTitle} Prompt\n\nThis demo uses a custom prompt to guide its responses.`;
    await writeFileSafely(promptInfoPath, promptInfoContent);
    console.log("Prompt info created at", promptInfoPath);
    
    const implementationPath = path.join(markdownDir, 'implementation.md');
    const implementationContent = `# Implementation Details\n\nThis is a customizable demo created with the demo builder.`;
    await writeFileSafely(implementationPath, implementationContent);
    console.log("Implementation doc created at", implementationPath);

    console.log(`Demo creation completed successfully for: ${demoId}`);
    
    // Return success response
    return NextResponse.json({
      success: true,
      demoId: demoId,
      demoPath: demoPath,
      message: `Demo created successfully with ID "${demoId}"`
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
function generateAssistantComponent(demoId: string, assistantTitle: string): string {
  const welcomeMessage = `Hello! I'm ${assistantTitle}. How can I help you today?`;
  const componentName = demoId.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  
  return `"use client";
import React, { useState, useRef, useEffect } from "react";
import Chat from "./chat";
import { Item } from "@/lib/assistant";
import PartialJSON from 'partial-json';

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
  
  // Add a buffer and timer for smoothing out state updates
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const UPDATE_INTERVAL_MS = 50; // Update UI at most every 50ms
  
  // Track pending update to avoid excessive state updates
  const pendingUpdateRef = useRef<string>('');
  const isUpdatingRef = useRef<boolean>(false);

  // Add a buffer size threshold before showing any text
  const INITIAL_BUFFER_SIZE = 20; // Only start showing text once we have at least 20 chars
  const hasStartedStreamingRef = useRef(false);
  const incompleteMessageFlagRef = useRef(false);

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
    
    // Store the latest text in our pending ref
    pendingUpdateRef.current = text;
    
    // If an update is already scheduled or in progress, don't schedule another one
    if (bufferTimeoutRef.current || isUpdatingRef.current) {
      return;
    }
    
    // If we recently updated, schedule an update for later
    if (now - lastUpdateTimeRef.current < UPDATE_INTERVAL_MS) {
      // Schedule a new update
      bufferTimeoutRef.current = setTimeout(() => {
        performUpdate(messageId);
      }, UPDATE_INTERVAL_MS);
    } else {
      // It's been long enough since our last update, do it immediately
      performUpdate(messageId);
    }
  };
  
  // Separate function to perform the actual update to avoid nesting setMessages calls
  const performUpdate = (messageId: string) => {
    // Clear any existing timeout
    if (bufferTimeoutRef.current) {
      clearTimeout(bufferTimeoutRef.current);
      bufferTimeoutRef.current = null;
    }
    
    // Mark that we're updating
    isUpdatingRef.current = true;
    lastUpdateTimeRef.current = Date.now();
    
    // Get the latest text from our ref
    const textToUpdate = pendingUpdateRef.current;
    
    // Perform the actual update
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
            text: textToUpdate
          }];
        }
      }
      
      return newMessages;
    });
    
    // After a small delay, mark update as complete
    setTimeout(() => {
      isUpdatingRef.current = false;
      
      // If content has changed during the update, schedule another update
      if (pendingUpdateRef.current !== textToUpdate) {
        updateMessageContent(pendingUpdateRef.current, messageId);
      }
    }, 10);
  };

  // Clean up any pending timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    };
  }, []);

  // Helper function to extract delta text from different possible structures
  const extractDeltaText = (parsedData: any): string => {
    let deltaText = '';
    
    try {
      // Based on observed logs, the delta text is directly in data.delta for delta events
      if (parsedData.data?.delta) {
        deltaText = parsedData.data.delta;
        return deltaText;
      }
      
      // If we have the OpenAI event structure from the logs
      if (
        parsedData.event === 'response.output_text.delta' && 
        typeof parsedData.data === 'object'
      ) {
        if (parsedData.data.type === 'response.output_text.delta' && parsedData.data.delta) {
          deltaText = parsedData.data.delta;
          return deltaText;
        }
      }
      
      // Standard chatGPT delta format
      if (parsedData.choices && Array.isArray(parsedData.choices) && parsedData.choices.length > 0) {
        const choice = parsedData.choices[0];
        if (choice.delta && choice.delta.content) {
          deltaText = choice.delta.content;
          return deltaText;
        }
      }
      
      // Fallback to deep search for complex structures
      const findDelta = (obj: any): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        
        if (obj.delta) {
          return typeof obj.delta === 'string' ? obj.delta : 
                 obj.delta.value ? obj.delta.value : 
                 obj.delta.content ? obj.delta.content : null;
        }
        
        if (obj.content && typeof obj.content === 'string') {
          return obj.content;
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
      
      // Final check for simplified event format from error recovery
      if (parsedData.event === 'error' && parsedData.data?.message) {
        deltaText = \`[Error: \${parsedData.data.message}]\`;
        return deltaText;
      }
      
      return '';
    } catch (error) {
      return '';
    }
  };

  // Add a helper function to manually attempt to fix malformed JSON
  const attemptJSONFix = (jsonStr: string): any => {
    try {
      // Try direct parsing first
      return JSON.parse(jsonStr);
    } catch (error) {
      // Common JSON errors we can try to fix
      let fixedJson = jsonStr;
      
      // 1. Try to fix unclosed quotes
      const unbalancedQuotes = (jsonStr.match(/"/g) || []).length % 2 !== 0;
      if (unbalancedQuotes) {
        fixedJson = fixedJson + '"';
      }
      
      // 2. Try to fix unclosed brackets/braces
      const openBraces = (jsonStr.match(/{/g) || []).length;
      const closeBraces = (jsonStr.match(/}/g) || []).length;
      if (openBraces > closeBraces) {
        fixedJson = fixedJson + '}'.repeat(openBraces - closeBraces);
      }
      
      // 3. Try to fix missing commas
      fixedJson = fixedJson.replace(/"\s*{/g, '",{');
      fixedJson = fixedJson.replace(/}\s*"/g, '},"');
      
      try {
        return JSON.parse(fixedJson);
      } catch (fixError) {
        // If we still can't parse, try a more brute force approach - extract known fields
        // Use regex to extract data we care about
        const extractJson: any = {};
        
        const eventMatch = jsonStr.match(/"event"\s*:\s*"([^"]*)"/);
        if (eventMatch && eventMatch[1]) {
          extractJson.event = eventMatch[1];
        }
        
        const deltaMatch = jsonStr.match(/"delta"\s*:\s*"([^"]*)"/);
        if (deltaMatch && deltaMatch[1]) {
          extractJson.data = { delta: deltaMatch[1] };
        }
        
        if (Object.keys(extractJson).length > 0) {
          return extractJson;
        }
        
        throw new Error("Failed to manually fix JSON");
      }
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Create a unique ID for this message
    const messageId = \`msg_\${Date.now()}\`;

    const userItem: Item = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message.trim() }],
    };

    try {
      setIsLoading(true);
      // Reset streaming flag for new message
      hasStartedStreamingRef.current = false;
      incompleteMessageFlagRef.current = false;
      
      // Add user message to the list
      setMessages(prev => [...prev, userItem]);
      
      // Create empty assistant message to start with
      const assistantItem: Item = {
        type: "message",
        role: "assistant",
        id: messageId,
        content: [{ 
          type: "output_text", 
          text: "" 
        }],
      };

      // Add the empty assistant message
      setMessages(prev => [...prev, assistantItem]);
      
      // Reset the response text for this new conversation turn
      responseTextRef.current = '';
      responseIdRef.current = messageId;
      
      // Call our API endpoint with streaming
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
      
      if (!response.ok) {
        throw new Error(\`Failed to get response from assistant: \${response.status} \${response.statusText}\`);
      }
      
      // Read the stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get stream reader');
      
      const decoder = new TextDecoder();
      let chunkCount = 0;
      let unprocessedChunk = ''; // Store partial chunks between reads
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Check if the message appears incomplete (e.g., missing closing tags, brackets)
          const finalText = responseTextRef.current;
          
          if (finalText) {
            if (finalText.includes('```') && (finalText.match(/\`\`\`/g) || []).length % 2 !== 0) {
              // Add closing code block if there's an odd number (meaning one is unclosed)
              responseTextRef.current += '\\n```';
              updateMessageContent(responseTextRef.current, responseIdRef.current);
            }
            
            // Process any remaining unprocessed chunk at the end
            if (unprocessedChunk.trim().length > 0) {
              try {
                // Try to find any meaningful text in the final chunk
                const finalChunkText = unprocessedChunk.replace(/^data:\s*/, '').trim();
                if (finalChunkText && finalChunkText !== '[DONE]') {
                  try {
                    // Try to parse as JSON or extract content
                    let finalDelta = '';
                    
                    try {
                      const parsedFinal = JSON.parse(finalChunkText);
                      finalDelta = extractDeltaText(parsedFinal);
                    } catch (e) {
                      try {
                        // Try partial JSON
                        const partialParsed = PartialJSON.parse(finalChunkText);
                        finalDelta = extractDeltaText(partialParsed);
                      } catch (partialError) {
                        // Try regex extraction
                        const deltaMatch = finalChunkText.match(/"delta"\s*:\s*"([^"]*)"/);
                        if (deltaMatch && deltaMatch[1]) {
                          finalDelta = deltaMatch[1];
                        }
                      }
                    }
                    
                    if (finalDelta) {
                      responseTextRef.current += finalDelta;
                      updateMessageContent(responseTextRef.current, responseIdRef.current);
                    }
                  } catch (finalParseError) {
                    // Ignore parsing errors in final chunk
                  }
                }
              } catch (finalChunkError) {
                // Ignore errors in final chunk processing
              }
            }
            
            // Check for other unclosed elements
            // Unclosed markdown formatting
            const asterisks = (finalText.match(/\\*/g) || []).length;
            if (asterisks % 2 !== 0) {
              responseTextRef.current += '*';
              updateMessageContent(responseTextRef.current, responseIdRef.current);
            }
            
            // Unclosed math blocks
            const mathBlocks = (finalText.match(/\$\$/g) || []).length;
            if (mathBlocks % 2 !== 0) {
              responseTextRef.current += ' $$';
              updateMessageContent(responseTextRef.current, responseIdRef.current);
            }
          }
          
          break;
        }
        
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        chunkCount++;
        
        // Check for potential incomplete responses
        if (chunkCount > 5 && chunk.includes('delta') && !chunk.includes('[DONE]')) {
          incompleteMessageFlagRef.current = true;
        }
        
        // Add this chunk to any unprocessed data from previous reads
        const fullChunk = unprocessedChunk + chunk;
        unprocessedChunk = '';
        
        // Split the chunk by data: but keep track of partial chunks
        let processedChunk = fullChunk;
        
        // Check if the chunk starts with a partial line (no 'data: ' prefix)
        if (!fullChunk.trimStart().startsWith('data: ')) {
          // If it doesn't start with 'data:', it might be an incomplete chunk
          unprocessedChunk = fullChunk;
          continue; // Skip to next chunk
        }
        
        // Handle multiple data: events in a single chunk
        const dataEvents = processedChunk.split('data: ');
        // Filter out empty strings (from the split)
        const validEvents = dataEvents.filter(event => event.trim().length > 0);
        
        for (let i = 0; i < validEvents.length; i++) {
          const eventData = validEvents[i];
          // Check if this is the last event and doesn't end with a newline - it might be incomplete
          if (i === validEvents.length - 1 && !eventData.endsWith('\\n\\n')) {
            unprocessedChunk = 'data: ' + eventData;
            continue;
          }
          
          // Clean up the event data by removing any trailing newlines
          const cleanEventData = eventData.replace(/\\n\\n$/, '');
          
          // Handle end of stream
          if (cleanEventData === '[DONE]') {
            setIsLoading(false);
            continue;
          }
          
          try {
            // First try to parse with standard JSON.parse
            let parsedData;
            try {
              parsedData = JSON.parse(cleanEventData);
            } catch (standardJsonError) {
              // If standard parsing fails, try alternative methods
              try {
                // Try to use PartialJSON if available
                parsedData = PartialJSON.parse(cleanEventData);
              } catch (partialJsonError) {
                // Last resort, try to extract text with regex directly
                try {
                  parsedData = attemptJSONFix(cleanEventData);
                } catch (fixError) {
                  // Final attempt with regex extraction
                  const deltaMatch = cleanEventData.match(/"delta"\s*:\s*"([^"]*)"/);
                  if (deltaMatch && deltaMatch[1]) {
                    // Create a minimal structure matching what we expect
                    parsedData = {
                      event: "response.output_text.delta",
                      data: {
                        delta: deltaMatch[1]
                      }
                    };
                  } else {
                    continue; // Skip this event if we can't parse it
                  }
                }
              }
            }
            
            // Process the parsed data
            if (parsedData) {
              const textDelta = extractDeltaText(parsedData);
              if (textDelta) {
                // Append the new text to our reference
                responseTextRef.current += textDelta;
                // Update the message with the latest text
                updateMessageContent(responseTextRef.current, responseIdRef.current);
              }
            }
          } catch (parseError) {
            // If all parsing attempts fail, just log the error and continue
            console.error('Error parsing event data:', parseError);
          }
        }
      }
    } catch (error) {
      // Add error message
      const errorItem: Item = {
        type: "message",
        role: "assistant",
        content: [{ 
          type: "output_text", 
          text: "I'm sorry, I encountered an error while processing your request. Please try again."
        }],
      };
      
      setMessages(prev => [...prev, errorItem]);
    } finally {
      // Ensure loading state is properly reset
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
            <p className="text-sm text-gray-600">Your AI Assistant</p>
          </div>
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
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          starters={[
            "Tell me about yourself",
            "What can you help me with?",
            "How does this demo work?",
            "What features do you have?"
          ]}
        />
      </div>
    </div>
  );
}`;
} 