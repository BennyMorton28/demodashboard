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
  const conflicts = [] as Array<string>;
  
  // Check demo directories
  if (existsSync(placesToCheck[0])) {
    const existingDemos: string[] = await readdir(placesToCheck[0]);
    if (existingDemos.includes(baseId)) {
      conflicts.push(baseId);
    }
  }
  
  // Check markdown directories
  if (existsSync(placesToCheck[1])) {
    const existingMarkdown: string[] = await readdir(placesToCheck[1]);
    if (existingMarkdown.includes(baseId)) {
      conflicts.push(baseId);
    }
  }
  
  // Check prompt files
  if (existsSync(placesToCheck[2])) {
    const promptFiles: string[] = await readdir(placesToCheck[2]);
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
      const existingDemos: string[] = await readdir(placesToCheck[0]);
      if (existingDemos.includes(newId)) {
        hasConflict = true;
      }
    }
    
    // Check in markdown directories
    if (!hasConflict && existsSync(placesToCheck[1])) {
      const existingMarkdown: string[] = await readdir(placesToCheck[1]);
      if (existingMarkdown.includes(newId)) {
        hasConflict = true;
      }
    }
    
    // Check prompt files
    if (!hasConflict && existsSync(placesToCheck[2])) {
      const promptFiles: string[] = await readdir(placesToCheck[2]);
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
  const componentName = demoId.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  
  return `"use client";

import React, { useState, useRef, useEffect } from "react";
import Chat from "@/components/chat";
import { Item, MessageItem } from "@/lib/assistant";

type ContentType = "input_text" | "output_text" | "refusal" | "output_audio";

interface MessageContent {
  type: ContentType;
  text: string;
}

interface Message {
  type: "message";
  role: "assistant" | "user";
  id: string;
  content: MessageContent[];
}

export default function ${componentName}Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "message",
      role: "assistant",
      id: \`initial_greeting_\${Date.now()}\`,
      content: [{ 
        type: "output_text", 
        text: "Hello! I'm ${assistantTitle}. How can I help you today?" 
      }],
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const responseTextRef = useRef("");
  const responseIdRef = useRef(\`msg_\${Date.now()}\`);
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageBufferRef = useRef("");

  // Cleanup function for timers
  useEffect(() => {
    return () => {
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    };
  }, []);

  // Function to update message content with rate limiting
  const updateMessageContent = (text: string, messageId: string) => {
    messageBufferRef.current = text;
    
    // If we already have a pending update, let it handle the new content
    if (bufferTimerRef.current) return;
    
    // Set up the update with a small delay
    bufferTimerRef.current = setTimeout(() => {
      setMessages(prev => {
        const newMessages = JSON.parse(JSON.stringify(prev)) as Message[];
        const index = newMessages.findIndex(
          (m) => m.type === "message" && m.role === "assistant" && m.id === messageId
        );

        if (index !== -1) {
          const assistantMessage = newMessages[index];
          if (assistantMessage.type === "message") {
            assistantMessage.content = [{
              type: "output_text",
              text: messageBufferRef.current
            }];
          }
        }
        return newMessages;
      });
      
      // Reset the timer
      bufferTimerRef.current = null;
      
      // If more content came in while we were updating, schedule another update
      if (messageBufferRef.current !== text) {
        updateMessageContent(messageBufferRef.current, messageId);
      }
      
      // Force a scroll check after content update
      try {
        setTimeout(() => {
          const messagesContainer = document.querySelector(".overflow-y-auto");
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
      } catch (error) {
        // Ignore scroll errors
      }
    }, 50); // Small delay to batch rapid updates
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Create a unique ID for this message
    const messageId = \`msg_\${Date.now()}\`;

    const userMessage: Message = {
      type: "message",
      role: "user",
      id: messageId,
      content: [{ type: "input_text", text: message.trim() }],
    };

    try {
      setIsLoading(true);
      // Add user message to the list
      setMessages(prev => [...prev, userMessage]);

      // Reset the buffer references
      messageBufferRef.current = "";
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = null;
      }

      // Create empty assistant message
      const assistantMessage: Message = {
        type: "message",
        role: "assistant",
        id: messageId,
        content: [{ 
          type: "output_text", 
          text: "" 
        }],
      };

      // Add the empty assistant message
      setMessages(prev => [...prev, assistantMessage]);

      // Reset the response text for this new conversation turn
      responseTextRef.current = "";
      responseIdRef.current = messageId;

      // Call our API endpoint
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message.trim(),
          demoId: "${demoId}"
        }),
      });

      if (!response.ok) {
        throw new Error(\`Failed to get response: \${response.status}\`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // Helper function to extract delta text from different data structures
      const extractDeltaText = (parsed: any): string => {
        if (parsed.choices && parsed.choices[0]?.delta?.content) {
          return parsed.choices[0].delta.content;
        }
        if (parsed.choices && parsed.choices[0]?.text) {
          return parsed.choices[0].text;
        }
        if (parsed.content) {
          return parsed.content;
        }
        return "";
      };

      // Helper function to attempt to fix malformed JSON
      const tryParseJSON = (text: string) => {
        try {
          return JSON.parse(text);
        } catch (e) {
          // Try to fix common JSON issues
          // 1. If it starts with data: 
          if (text.startsWith("data: ")) {
            return tryParseJSON(text.substring(6));
          }
          // 2. Check if we need to add closing brackets/braces
          const fixedText = text
            .replace(/\\n/g, "")
            .trim();
            
          // If all else fails, return null
          return null;
        }
      };

      // Process the stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Decode the chunk and add it to our text
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\\n").filter(line => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = tryParseJSON(data);
              if (parsed) {
                const deltaText = extractDeltaText(parsed);
                if (deltaText) {
                  responseTextRef.current += deltaText;
                  updateMessageContent(responseTextRef.current, responseIdRef.current);
                }
              }
            } catch (e) {
              console.error("Error parsing JSON from stream:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      // Add error message
      const errorItem: Message = {
        type: "message",
        role: "assistant",
        id: messageId,
        content: [{ 
          type: "output_text", 
          text: "Sorry, I encountered an error processing your request." 
        }],
      };

      setMessages(prev => [...prev, errorItem]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-visible">
      {/* Assistant Info Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">${assistantTitle}</h2>
            <p className="text-sm text-gray-600">Your AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Chat Component */}
      <div 
        className="flex-1 overflow-visible" 
        style={{ 
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          paddingBottom: "20px",
          overflow: "visible"
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
