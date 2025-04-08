import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs';
import { demoLogger, validateDemoCreation } from '@/lib/debug-utils';

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
          });
        } else {
          console.log(`[${timestamp}] Data:`, JSON.stringify(data, null, 2));
        }
      } else {
        console.log(`[${timestamp}] Data:`, data);
      }
    } catch (error) {
      console.log(`[${timestamp}] Could not stringify data:`, data);
    }
  }
}

// Helper function to check if a directory exists and create it if it doesn't
async function createDirectorySafely(dirPath: string): Promise<void> {
  try {
    if (!existsSync(dirPath)) {
      logDebug(`Creating directory: ${dirPath}`);
      await mkdir(dirPath, { recursive: true });
      logDebug(`Directory created: ${dirPath}`);
    } else {
      logDebug(`Directory already exists: ${dirPath}`);
    }
  } catch (error) {
    logDebug(`Error creating directory: ${dirPath}`, error);
    throw error;
  }
}

// Helper function to ensure a file is written to both regular and standalone locations
async function writeToAllLocations(filePath: string, content: string | Buffer): Promise<void> {
  // Write to the primary location
  await writeFile(filePath, content);
  logDebug(`File saved to ${filePath}`);
  
  // If we're in the source directory, also write to the standalone location
  const baseDir = process.cwd();
  if (!baseDir.includes('.next/standalone') && !baseDir.endsWith('standalone')) {
    // Convert this path to its standalone equivalent
    const relativePath = path.relative(baseDir, filePath);
    const standalonePath = path.join(baseDir, '.next', 'standalone', relativePath);
    
    // Ensure the directory exists
    await createDirectorySafely(path.dirname(standalonePath));
    
    // Write the file
    await writeFile(standalonePath, content);
    logDebug(`File also saved to standalone location: ${standalonePath}`);
  }
}

// Helper function to ensure a directory is created in both regular and standalone locations
async function createDirectoryInAllLocations(dirPath: string): Promise<void> {
  // Create in primary location
  await createDirectorySafely(dirPath);
  
  // If we're in the source directory, also create in the standalone location
  const baseDir = process.cwd();
  if (!baseDir.includes('.next/standalone') && !baseDir.endsWith('standalone')) {
    // Convert this path to its standalone equivalent
    const relativePath = path.relative(baseDir, dirPath);
    const standalonePath = path.join(baseDir, '.next', 'standalone', relativePath);
    
    // Create the directory
    await createDirectorySafely(standalonePath);
    logDebug(`Directory also created in standalone location: ${standalonePath}`);
  }
}

// Initialize content and prompt directories
const contentDir = path.join(process.cwd(), 'lib', 'content');
const promptsDir = path.join(process.cwd(), 'lib', 'prompts');
const dataDir = path.join(process.cwd(), 'data');
const publicDir = path.join(process.cwd(), 'public');
const markdownBaseDir = path.join(publicDir, 'markdown');

// Define interfaces
interface DemoInfo {
  id: string;
  title?: string;
  name?: string;
  description: string;
  author?: string;
  category?: string;
  created?: string;
  updated?: string;
  icon?: string;
  isLocked?: boolean;
  password?: string;
}

interface Assistant {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isLocked: boolean;
  password?: string;
}

// Helper function to generate the demo-info.json file
function generateDemoInfo(
  demoId: string, 
  assistantTitle: string,
  description: string,
  author: string,
  category: string
): string {
  return JSON.stringify({
    id: demoId,
    title: assistantTitle,
    description: description,
    author: author,
    category: category,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  }, null, 2);
}

// Simple helper to generate an assistant component
function generateAssistantComponent(demoId: string, assistantTitle: string): string {
  let component = '';
  
  // Convert demoId to a proper component name
  const nameParts = demoId.split('-');
  const capitalizedParts = nameParts.map(part => {
    return part.charAt(0).toUpperCase() + part.slice(1);
  });
  const componentName = capitalizedParts.join('');
  
  // Build the component string using concatenation instead of complex template literals
  component += '"use client";\n\n';
  component += 'import React, { useState, useRef, useEffect } from "react";\n';
  component += 'import Chat from "./chat";\n';
  component += 'import { Item } from "@/lib/assistant";\n\n';
  
  component += 'export default function ' + componentName + 'Assistant() {\n';
  component += '  // Start with an empty message list - no initial greeting\n';
  component += '  const [messages, setMessages] = useState([]);\n';
  component += '  const [isLoading, setIsLoading] = useState(false);\n';
  component += '  const responseTextRef = useRef("");\n';
  component += '  const responseIdRef = useRef(`msg_${Date.now()}`);\n';
  component += '  const bufferTimerRef = useRef(null);\n';
  component += '  const messageBufferRef = useRef("");\n\n';
  
  component += '  // Cleanup function for timers\n';
  component += '  useEffect(() => {\n';
  component += '    return () => {\n';
  component += '      if (bufferTimerRef.current) {\n';
  component += '        clearTimeout(bufferTimerRef.current);\n';
  component += '      }\n';
  component += '    };\n';
  component += '  }, []);\n\n';
  
  component += '  // Function to update message content with rate limiting\n';
  component += '  const updateMessageContent = (text, messageId) => {\n';
  component += '    messageBufferRef.current = text;\n';
  component += '    \n';
  component += '    // If we already have a pending update, let it handle the new content\n';
  component += '    if (bufferTimerRef.current) return;\n';
  component += '    \n';
  component += '    // Set up the update with a small delay\n';
  component += '    bufferTimerRef.current = setTimeout(() => {\n';
  component += '      setMessages(prev => {\n';
  component += '        const newMessages = JSON.parse(JSON.stringify(prev));\n';
  component += '        const index = newMessages.findIndex(\n';
  component += '          (m) => m.type === "message" && m.role === "assistant" && m.id === messageId\n';
  component += '        );\n\n';
  
  component += '        if (index !== -1) {\n';
  component += '          const assistantMessage = newMessages[index];\n';
  component += '          if (assistantMessage.type === "message") {\n';
  component += '            assistantMessage.content = [{\n';
  component += '              type: "output_text",\n';
  component += '              text: messageBufferRef.current\n';
  component += '            }];\n';
  component += '          }\n';
  component += '        }\n';
  component += '        return newMessages;\n';
  component += '      });\n';
  component += '      \n';
  component += '      // Reset the timer\n';
  component += '      bufferTimerRef.current = null;\n';
  component += '      \n';
  component += '      // If more content came in while we were updating, schedule another update\n';
  component += '      if (messageBufferRef.current !== text) {\n';
  component += '        updateMessageContent(messageBufferRef.current, messageId);\n';
  component += '      }\n';
  component += '      \n';
  component += '      // Force a scroll check after content update\n';
  component += '      try {\n';
  component += '        setTimeout(() => {\n';
  component += '          const messagesContainer = document.querySelector(".overflow-y-auto");\n';
  component += '          if (messagesContainer) {\n';
  component += '            messagesContainer.scrollTop = messagesContainer.scrollHeight;\n';
  component += '          }\n';
  component += '        }, 100);\n';
  component += '      } catch (error) {\n';
  component += '        // Ignore scroll errors\n';
  component += '      }\n';
  component += '    }, 50); // Small delay to batch rapid updates\n';
  component += '  };\n\n';
  
  component += '  const handleSendMessage = async (message) => {\n';
  component += '    if (!message.trim()) return;\n\n';
  
  component += '    // Create a unique ID for this message\n';
  component += '    const messageId = `msg_${Date.now()}`;\n\n';
  
  component += '    const userItem = {\n';
  component += '      type: "message",\n';
  component += '      role: "user",\n';
  component += '      content: [{ type: "input_text", text: message.trim() }],\n';
  component += '    };\n\n';
  
  component += '    try {\n';
  component += '      setIsLoading(true);\n';
  component += '      // Add user message to the list\n';
  component += '      setMessages(prev => [...prev, userItem]);\n\n';
  
  component += '      // Reset the buffer references\n';
  component += '      messageBufferRef.current = "";\n';
  component += '      if (bufferTimerRef.current) {\n';
  component += '        clearTimeout(bufferTimerRef.current);\n';
  component += '        bufferTimerRef.current = null;\n';
  component += '      }\n\n';
  
  component += '      // Create empty assistant message\n';
  component += '      const assistantItem = {\n';
  component += '        type: "message",\n';
  component += '        role: "assistant",\n';
  component += '        id: messageId,\n';
  component += '        content: [{ \n';
  component += '          type: "output_text", \n';
  component += '          text: "" \n';
  component += '        }],\n';
  component += '      };\n\n';
  
  component += '      // Add the empty assistant message\n';
  component += '      setMessages(prev => [...prev, assistantItem]);\n\n';
  
  component += '      // Reset the response text for this new conversation turn\n';
  component += '      responseTextRef.current = "";\n';
  component += '      responseIdRef.current = messageId;\n\n';
  
  component += '      // Call our API endpoint\n';
  component += '      const response = await fetch("/api/chat", {\n';
  component += '        method: "POST",\n';
  component += '        headers: {\n';
  component += '          "Content-Type": "application/json",\n';
  component += '        },\n';
  component += '        body: JSON.stringify({\n';
  component += '          message: message.trim(),\n';
  component += '          demoId: "' + demoId + '"\n';
  component += '        }),\n';
  component += '      });\n\n';
  
  component += '      if (!response.ok) {\n';
  component += '        throw new Error(`Failed to get response: ${response.status}`);\n';
  component += '      }\n\n';
  
  component += '      if (!response.body) {\n';
  component += '        throw new Error("No response body");\n';
  component += '      }\n\n';
  
  component += '      const reader = response.body.getReader();\n';
  component += '      const decoder = new TextDecoder();\n';
  component += '      let fullText = "";\n\n';
  
  component += '      // Helper function to extract delta text from different data structures\n';
  component += '      const extractDeltaText = (parsed) => {\n';
  component += '        if (parsed.choices && parsed.choices[0]?.delta?.content) {\n';
  component += '          return parsed.choices[0].delta.content;\n';
  component += '        }\n';
  component += '        if (parsed.choices && parsed.choices[0]?.text) {\n';
  component += '          return parsed.choices[0].text;\n';
  component += '        }\n';
  component += '        if (parsed.content) {\n';
  component += '          return parsed.content;\n';
  component += '        }\n';
  component += '        return "";\n';
  component += '      };\n\n';
  
  component += '      // Helper function to attempt to fix malformed JSON\n';
  component += '      const tryParseJSON = (text) => {\n';
  component += '        try {\n';
  component += '          return JSON.parse(text);\n';
  component += '        } catch (e) {\n';
  component += '          // Try to fix common JSON issues\n';
  component += '          // 1. If it starts with data: \n';
  component += '          if (text.startsWith("data: ")) {\n';
  component += '            return tryParseJSON(text.substring(6));\n';
  component += '          }\n';
  component += '          // 2. Check if we need to add closing brackets/braces\n';
  component += '          const fixedText = text\n';
  component += '            .replace(/\\n/g, "")\n';
  component += '            .trim();\n';
  component += '            \n';
  component += '          // If all else fails, return null\n';
  component += '          return null;\n';
  component += '        }\n';
  component += '      };\n\n';
  
  component += '      // Process the stream\n';
  component += '      while (true) {\n';
  component += '        const { value, done } = await reader.read();\n';
  component += '        if (done) break;\n\n';
  
  component += '        // Decode the chunk and add it to our text\n';
  component += '        const chunk = decoder.decode(value, { stream: true });\n';
  component += '        const lines = chunk.split("\\n").filter(line => line.trim() !== "");\n\n';
  
  component += '        for (const line of lines) {\n';
  component += '          if (line.startsWith("data: ")) {\n';
  component += '            const data = line.slice(6);\n';
  component += '            if (data === "[DONE]") continue;\n\n';
  
  component += '            try {\n';
  component += '              const parsed = JSON.parse(data);\n';
  component += '              const deltaText = extractDeltaText(parsed);\n';
  component += '              if (deltaText) {\n';
  component += '                fullText += deltaText;\n';
  component += '                responseTextRef.current = fullText;\n';
  component += '                updateMessageContent(fullText, responseIdRef.current);\n';
  component += '              }\n';
  component += '            } catch (e) {\n';
  component += '              // Try to be more resilient with malformed JSON\n';
  component += '              const parsed = tryParseJSON(data);\n';
  component += '              if (parsed) {\n';
  component += '                const deltaText = extractDeltaText(parsed);\n';
  component += '                if (deltaText) {\n';
  component += '                  fullText += deltaText;\n';
  component += '                  responseTextRef.current = fullText;\n';
  component += '                  updateMessageContent(fullText, responseIdRef.current);\n';
  component += '                }\n';
  component += '              }\n';
  component += '            }\n';
  component += '          }\n';
  component += '        }\n';
  component += '      }\n';
  component += '      \n';
  component += '      // Ensure the final state is set correctly\n';
  component += '      if (responseTextRef.current) {\n';
  component += '        // Force a final update\n';
  component += '        if (bufferTimerRef.current) {\n';
  component += '          clearTimeout(bufferTimerRef.current);\n';
  component += '          bufferTimerRef.current = null;\n';
  component += '        }\n';
  component += '        updateMessageContent(responseTextRef.current, responseIdRef.current);\n';
  component += '      }\n';
  component += '    } catch (error) {\n';
  component += '      console.error("Error in handleSendMessage:", error);\n';
  component += '      // Add error message\n';
  component += '      const errorItem = {\n';
  component += '        type: "message",\n';
  component += '        role: "assistant",\n';
  component += '        content: [{ \n';
  component += '          type: "output_text", \n';
  component += '          text: "Sorry, I encountered an error processing your request." \n';
  component += '        }],\n';
  component += '      };\n\n';
  
  component += '      setMessages(prev => [...prev, errorItem]);\n';
  component += '    } finally {\n';
  component += '      setIsLoading(false);\n';
  component += '    }\n';
  component += '  };\n\n';
  
  component += '  return (\n';
  component += '    <div className="h-full w-full flex flex-col overflow-visible">\n';
  component += '      {/* Assistant Info Header */}\n';
  component += '      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">\n';
  component += '        <div className="flex justify-between items-center">\n';
  component += '          <div>\n';
  component += '            <h2 className="text-lg font-semibold">' + assistantTitle + '</h2>\n';
  component += '            <p className="text-sm text-gray-600">Your AI Assistant</p>\n';
  component += '          </div>\n';
  component += '        </div>\n';
  component += '      </div>\n\n';
  
  component += '      {/* Chat Component */}\n';
  component += '      <div \n';
  component += '        className="flex-1 overflow-visible" \n';
  component += '        style={{ \n';
  component += '          minHeight: 0,\n';
  component += '          display: "flex",\n';
  component += '          flexDirection: "column",\n';
  component += '          paddingBottom: "20px",\n';
  component += '          overflow: "visible"\n';
  component += '        }}\n';
  component += '      >\n';
  component += '        <Chat \n';
  component += '          messages={messages} \n';
  component += '          onSendMessage={handleSendMessage}\n';
  component += '          isLoading={isLoading}\n';
  component += '          starters={[\n';
  component += '            "What can you help me with?",\n';
  component += '            "Tell me about yourself",\n';
  component += '            "What information do you have about this topic?",\n';
  component += '            "How does this demo work?"\n';
  component += '          ]}\n';
  component += '        />\n';
  component += '      </div>\n';
  component += '    </div>\n';
  component += '  );\n';
  component += '}';
  
  return component;
}

// Helper to get all demos
async function getAllDemos() {
  const demoInfoDir = path.join(process.cwd(), 'data');
  const demos: DemoInfo[] = [];
  
  try {
    const files = await readdir(demoInfoDir);
    
    for (const file of files) {
      if (!file.endsWith('-info.json')) continue;
      
      const filePath = path.join(demoInfoDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      try {
        const demoInfo = JSON.parse(fileContent) as DemoInfo;
        demos.push(demoInfo);
      } catch (error) {
        logDebug(`Error parsing demo info file: ${filePath}`, error);
      }
    }
    
    return demos;
  } catch (error) {
    logDebug('Error reading demo info directory', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const demos = await getAllDemos();
    return NextResponse.json(demos);
  } catch (error) {
    logDebug('Error in GET /api/upload', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure directories exist in both locations
    await createDirectoryInAllLocations(contentDir);
    await createDirectoryInAllLocations(promptsDir);
    await createDirectoryInAllLocations(dataDir);
    await createDirectoryInAllLocations(path.join(dataDir, 'demo-info'));
    await createDirectoryInAllLocations(markdownBaseDir);
    await createDirectoryInAllLocations(path.join(process.cwd(), 'public', 'icons'));
    await createDirectoryInAllLocations(path.join(process.cwd(), 'app', 'demos'));

    // Get form data
    const formData = await request.formData();
    
    // Start logger
    demoLogger.info(`Demo upload started`, {
      isMultiAssistant: formData.get('isMultiAssistant') === 'true', 
      demoId: formData.get('demoId') as string,
      contentFile: formData.get('contentFile') ? (formData.get('contentFile') as File).name : null,
    });
    
    // Extract fields
    const demoId = formData.get('demoId') as string;
    const isMultiAssistant = formData.get('isMultiAssistant') === 'true';
    const contentFile = formData.get('contentFile') as File;
    
    // Different validation paths for single vs multi-assistant demos
    if (isMultiAssistant) {
      // Multi-assistant demo validation
      const assistantsCount = parseInt(formData.get('assistantsCount') as string, 10);
      const demoTitle = formData.get('demoTitle') as string;
      
      if (!demoId || !contentFile || isNaN(assistantsCount) || assistantsCount <= 0 || !demoTitle) {
        return NextResponse.json(
          { error: 'Missing required fields for multi-assistant demo: demoId, demoTitle, contentFile, assistantsCount' },
          { status: 400 }
        );
      }
      
      logDebug('Processing multi-assistant demo upload', { 
        demoId,
        demoTitle,
        assistantsCount,
        contentFileName: contentFile?.name
      });
      
      // Create necessary directories
      const markdownDir = path.join(markdownBaseDir, demoId);
      await createDirectorySafely(markdownDir);
      
      // Save the content file
      try {
        const contentPath = path.join(markdownDir, "content.md");
        const contentBuffer = Buffer.from(await contentFile.arrayBuffer());
        await writeToAllLocations(contentPath, contentBuffer);
        logDebug(`Content file saved to ${contentPath}`);
      } catch (error) {
        logDebug('Error saving content file', error);
        return NextResponse.json(
          { error: 'Error saving content file' },
          { status: 500 }
        );
      }
      
      // Process assistants data
      const assistants: Assistant[] = [];
      for (let i = 0; i < assistantsCount; i++) {
        const name = formData.get(`assistant_${i}_name`) as string;
        const promptFile = formData.get(`assistant_${i}_promptFile`) as File;
        const description = formData.get(`assistant_${i}_description`) as string || '';
        const iconFile = formData.get(`assistant_${i}_iconFile`) as File || null;
        const isLocked = formData.get(`assistant_${i}_isLocked`) === 'true';
        const password = formData.get(`assistant_${i}_password`) as string || '';
        
        // Save prompt file for this assistant
        try {
          const promptPath = path.join(promptsDir, `${demoId}-assistant-${i}-prompt.md`);
          const promptBuffer = Buffer.from(await promptFile.arrayBuffer());
          await writeToAllLocations(promptPath, promptBuffer);
          logDebug(`Prompt file for assistant ${i} saved to ${promptPath}`);
        } catch (error) {
          logDebug(`Error saving prompt file for assistant ${i}`, error);
          return NextResponse.json(
            { error: `Error saving prompt file for assistant ${i}` },
            { status: 500 }
          );
        }
        
        // Save assistant icon if provided
        let iconPath = '';
        if (iconFile && iconFile.size > 0) {
          try {
            const iconDir = path.join(process.cwd(), 'public', 'icons');
            
            // Get file extension and normalize
            const originalExt = path.extname(iconFile.name);
            const fileExt = originalExt || '.png';
            const normalizedExt = fileExt.toLowerCase();
            
            // Create unique filename for this assistant's icon
            const iconFilename = `${demoId}-assistant-${i}${normalizedExt}`;
            iconPath = `/icons/${iconFilename}`; // Store the path for later use
            
            // Save the file
            const fullIconPath = path.join(iconDir, iconFilename);
            const iconBuffer = Buffer.from(await iconFile.arrayBuffer());
            await writeToAllLocations(fullIconPath, iconBuffer);
            logDebug(`Icon for assistant ${i} saved to ${fullIconPath}`);
          } catch (error) {
            logDebug(`Error saving icon for assistant ${i}`, error);
            // Continue even if icon saving fails
          }
        } else {
          // Create default icon with initials
          try {
            const iconDir = path.join(process.cwd(), 'public', 'icons');
            
            // Generate SVG with initials
            const initials = name
              .split(' ')
              .map(part => part.charAt(0))
              .join('')
              .toUpperCase()
              .substring(0, 2);
            
            const svgContent = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#f3f4f6"/>
              <text 
                x="50%" 
                y="50%" 
                font-family="Arial, sans-serif" 
                font-size="200" 
                font-weight="bold" 
                fill="#374151" 
                text-anchor="middle" 
                dominant-baseline="middle"
              >${initials}</text>
            </svg>`;
            
            const iconFilename = `${demoId}-assistant-${i}.svg`;
            iconPath = `/icons/${iconFilename}`; // Store the path for later use
            
            const fullIconPath = path.join(iconDir, iconFilename);
            await writeToAllLocations(fullIconPath, svgContent);
            logDebug(`Default icon created for assistant ${i} at ${fullIconPath}`);
          } catch (error) {
            logDebug(`Error creating default icon for assistant ${i}`, error);
            // Continue without an icon if creation fails
          }
        }
        
        // Add assistant info to our array
        assistants.push({
          id: i.toString(),
          name,
          description,
          icon: iconPath,
          isLocked,
          password
        });
      }
      
      // Save assistants configuration to a JSON file
      const assistantsConfig = {
        demoId,
        assistants
      };
      
      try {
        const configDir = path.join(dataDir, 'multi-assistants');
        await createDirectorySafely(configDir);
        
        const configPath = path.join(configDir, `${demoId}.json`);
        await writeToAllLocations(configPath, JSON.stringify(assistantsConfig, null, 2));
        logDebug(`Assistants configuration saved to ${configPath}`);
      } catch (error) {
        logDebug('Error saving assistants configuration', error);
        return NextResponse.json(
          { error: 'Error saving assistants configuration' },
          { status: 500 }
        );
      }
      
      // Generate and save the demo info file for dashboard display
      try {
        const demoInfoPath = path.join(dataDir, 'demo-info', `${demoId}.json`);
        const demoInfo = {
          id: demoId,
          title: demoTitle,
          description: `Multi-assistant demo with ${assistantsCount} assistants`,
          type: "multi-assistant",
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
        
        await writeToAllLocations(demoInfoPath, JSON.stringify(demoInfo, null, 2));
        logDebug(`Demo info saved to ${demoInfoPath}`);
      } catch (error) {
        logDebug('Error saving demo info', error);
        return NextResponse.json(
          { error: 'Error saving demo info' },
          { status: 500 }
        );
      }
      
      // Create the demo page for multi-assistant demo
      try {
        const demoPageDir = path.join(process.cwd(), 'app', 'demos', demoId);
        await createDirectorySafely(demoPageDir);
        
        const componentName = demoId.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
        const pageContent = `"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DemoMarkdownDisplay from "@/components/demo-markdown-display";
import MultiAssistantDemoLayout from "@/components/multi-assistant-demo-layout";
import MultiAssistantChat from "@/components/multi-assistant-chat";

// Define the Assistant type
interface Assistant {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isLocked: boolean;
  password?: string;
}

export default function ${componentName}Demo() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [activeAssistant, setActiveAssistant] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Fetch assistants configuration
  useEffect(() => {
    if (status === "authenticated") {
      fetchAssistants();
    }
  }, [status]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);
  
  const fetchAssistants = async () => {
    try {
      setLoading(true);
      const response = await fetch(\`/api/multi-assistants?demoId=${demoId}\`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch assistants configuration");
      }
      
      const data = await response.json();
      
      if (data.assistants && data.assistants.length > 0) {
        setAssistants(data.assistants);
        // Set first unlocked assistant as active
        const firstUnlocked = data.assistants.find(a => !a.isLocked);
        if (firstUnlocked) {
          setActiveAssistant(firstUnlocked.id);
        } else {
          setActiveAssistant(data.assistants[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching assistants:", err);
      setError("Failed to load assistants");
    } finally {
      setLoading(false);
    }
  };
  
  // Handler for changing active assistant
  const handleAssistantChange = (assistantId: string) => {
    setActiveAssistant(assistantId);
  };
  
  // Handler for unlocking assistant
  const handleUnlockAssistant = async (assistantId: string, password: string): Promise<boolean> => {
    const assistant = assistants.find(a => a.id === assistantId);
    
    if (!assistant) return false;
    
    // Check if password matches
    const passwordMatches = assistant.password === password;
    
    if (passwordMatches) {
      // Update the assistant to be unlocked
      setAssistants(prev => 
        prev.map((a: Assistant) => 
          a.id === assistantId 
            ? { ...a, isLocked: false } 
            : a
        )
      );
    }
    
    return passwordMatches;
  };
  
  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Find the currently active assistant to get its name
  const currentAssistant = assistants.find(a => a.id === activeAssistant);
  const assistantName = currentAssistant?.name || "Assistant";

  return (
    <MultiAssistantDemoLayout
      title="${demoTitle}"
      assistants={assistants}
      activeAssistant={activeAssistant}
      onAssistantChange={handleAssistantChange}
      onUnlockAssistant={handleUnlockAssistant}
      contentComponent={<DemoMarkdownDisplay demoId="${demoId}" />}
      chatComponent={
        <MultiAssistantChat 
          demoId="${demoId}" 
          assistantId={activeAssistant} 
          assistantName={assistantName} 
        />
      }
    />
  );
}`;
        
        const pagePath = path.join(demoPageDir, 'page.tsx');
        await writeToAllLocations(pagePath, pageContent);
        logDebug(`Multi-assistant demo page created at ${pagePath}`);
        
        // Also create the create-success directory and ensure it exists
        const successDir = path.join(demoPageDir, 'create-success');
        await createDirectorySafely(successDir);
        
        // We don't need to create the page.tsx in success dir as it's a global component
        logDebug(`Success directory created at ${successDir}`);
      } catch (error) {
        logDebug('Error creating multi-assistant demo page', error);
        // Create a more detailed error message
        let errorDetails = 'Unknown error';
        if (error instanceof Error) {
          errorDetails = `${error.name}: ${error.message}\nStack: ${error.stack}`;
        }
        logDebug(`Detailed error information: ${errorDetails}`);
        
        // Don't fail the whole process, but log the error extensively
      }
      
      // Process icon file for the demo card
      const iconFile = formData.get('iconFile') as File;
      if (iconFile && iconFile.size > 0) {
        try {
          const iconDir = path.join(process.cwd(), 'public', 'icons');
          await createDirectorySafely(iconDir);
          
          // Get the file extension from the uploaded file or default to .png
          const originalExt = path.extname(iconFile.name);
          const fileExt = originalExt || '.png';
          
          // Always use lowercase extension
          const normalizedExt = fileExt.toLowerCase();
          const iconFilename = `${demoId}${normalizedExt}`;
          const iconPath = path.join(iconDir, iconFilename);
          
          const iconBuffer = Buffer.from(await iconFile.arrayBuffer());
          await writeToAllLocations(iconPath, iconBuffer);
          logDebug(`Demo icon saved to ${iconPath} (extension: ${normalizedExt})`);
        } catch (error) {
          logDebug('Error saving demo icon', error);
          // Continue with the process even if icon saving fails
        }
      } else {
        // Create a default icon for the demo
        try {
          logDebug('No demo icon provided, creating default icon with initials');
          const iconDir = path.join(process.cwd(), 'public', 'icons');
          
          // Generate SVG with initials
          const getInitials = (name: string): string => {
            return name
              .split(' ')
              .map(part => part.charAt(0))
              .join('')
              .toUpperCase()
              .substring(0, 2);
          };
          
          const initials = getInitials(demoTitle);
          const svgContent = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f3f4f6"/>
            <text 
              x="50%" 
              y="50%" 
              font-family="Arial, sans-serif" 
              font-size="200" 
              font-weight="bold" 
              fill="#374151" 
              text-anchor="middle" 
              dominant-baseline="middle"
            >${initials}</text>
          </svg>`;
          
          const iconPath = path.join(iconDir, `${demoId}.svg`);
          await writeToAllLocations(iconPath, svgContent);
          logDebug(`Default demo icon created at ${iconPath}`);
        } catch (error) {
          logDebug('Error creating default demo icon', error);
          // Continue with the process even if icon creation fails
        }
      }
      
      // Validate the created demo to ensure all files exist
      try {
        const validationResult = await validateDemoCreation(demoId);
        demoLogger.info(`Demo validation results for ${demoId}:`, validationResult);
        
        if (!validationResult.success) {
          demoLogger.warn(`Demo validation failed for ${demoId} - some required files may be missing`, validationResult.details);
        }
      } catch (error) {
        demoLogger.error(`Error validating demo creation for ${demoId}`, error);
      }
      
      // Return success response
      return NextResponse.json({ 
        success: true, 
        message: 'Multi-assistant demo created successfully',
        demoId
      });
    } else {
      // Single assistant demo validation
      const assistantTitle = formData.get('assistantTitle') as string;
      const description = formData.get('description') as string;
      const author = formData.get('author') as string;
      const category = formData.get('category') as string;
      const promptFile = formData.get('promptFile') as File;
      
      // Validate required fields
      if (!demoId || !assistantTitle || !promptFile) {
        return NextResponse.json(
          { error: 'Missing required fields: demoId, assistantTitle, promptFile' },
          { status: 400 }
        );
      }
      
      logDebug('Processing demo upload', { 
        demoId, 
        assistantTitle, 
        description, 
        author,
        category,
        promptFileName: promptFile?.name, 
        contentFileName: contentFile?.name 
      });
      
      // Validate demoId format (lowercase, dash-separated)
      if (!/^[a-z0-9-]+$/.test(demoId)) {
        return NextResponse.json(
          { error: 'Invalid demoId format. Use lowercase letters, numbers, and dashes only.' },
          { status: 400 }
        );
      }
      
      // Create demo-specific directories
      const markdownDir = path.join(markdownBaseDir, demoId);
      await createDirectorySafely(markdownDir);
      
      // Save the prompt file
      try {
        const promptPath = path.join(promptsDir, `${demoId}-prompt.md`);
        const promptBuffer = Buffer.from(await promptFile.arrayBuffer());
        await writeToAllLocations(promptPath, promptBuffer);
        logDebug(`Prompt file saved to ${promptPath}`);
      } catch (error) {
        logDebug('Error saving prompt file', error);
        return NextResponse.json(
          { error: 'Error saving prompt file' },
          { status: 500 }
        );
      }
      
      // Save the content file if provided
      if (contentFile) {
        try {
          const contentPath = path.join(markdownDir, "content.md");
          const contentBuffer = Buffer.from(await contentFile.arrayBuffer());
          await writeToAllLocations(contentPath, contentBuffer);
          logDebug(`Content file saved to ${contentPath}`);
        } catch (error) {
          logDebug('Error saving content file', error);
          return NextResponse.json(
            { error: 'Error saving content file' },
            { status: 500 }
          );
        }
      }
      
      // Generate and save the demo info file
      try {
        const demoInfoPath = path.join(dataDir, 'demo-info', `${demoId}.json`);
        const demoInfo = generateDemoInfo(demoId, assistantTitle, description, author, category);
        await writeToAllLocations(demoInfoPath, demoInfo);
        logDebug(`Demo info saved to ${demoInfoPath}`);
      } catch (error) {
        logDebug('Error saving demo info', error);
        return NextResponse.json(
          { error: 'Error saving demo info' },
          { status: 500 }
        );
      }
      
      // Generate and save the assistant component
      try {
        const componentDir = path.join(process.cwd(), 'components');
        await createDirectorySafely(componentDir);
        
        const componentPath = path.join(componentDir, `${demoId}-assistant.tsx`);
        const componentContent = generateAssistantComponent(demoId, assistantTitle);
        await writeToAllLocations(componentPath, componentContent);
        logDebug(`Assistant component saved to ${componentPath}`);
      } catch (error) {
        logDebug('Error saving assistant component', error);
        return NextResponse.json(
          { error: 'Error saving assistant component' },
          { status: 500 }
        );
      }
      
      // Process icon file if provided
      const iconFile = formData.get('iconFile') as File;
      if (iconFile && iconFile.size > 0) {
        try {
          const iconDir = path.join(process.cwd(), 'public', 'icons');
          await createDirectorySafely(iconDir);
          
          // Get the file extension from the uploaded file or default to .png
          const originalExt = path.extname(iconFile.name);
          const fileExt = originalExt || '.png';
          
          // Always use lowercase extension
          const normalizedExt = fileExt.toLowerCase();
          const iconFilename = `${demoId}${normalizedExt}`;
          const iconPath = path.join(iconDir, iconFilename);
          
          const iconBuffer = Buffer.from(await iconFile.arrayBuffer());
          await writeToAllLocations(iconPath, iconBuffer);
          logDebug(`Icon file saved to ${iconPath} (extension: ${normalizedExt})`);
        } catch (error) {
          logDebug('Error saving icon file', error);
          // Continue with the process even if icon saving fails
        }
      } else {
        // Create a default icon using initials if no icon is provided
        try {
          logDebug('No icon provided, creating default icon with initials');
          const iconDir = path.join(process.cwd(), 'public', 'icons');
          await createDirectorySafely(iconDir);
          
          // Generate SVG with initials
          const getInitials = (name: string): string => {
            return name
              .split(' ')
              .map(part => part.charAt(0))
              .join('')
              .toUpperCase()
              .substring(0, 2);
          };
          
          const initials = getInitials(assistantTitle);
          const svgContent = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f3f4f6"/>
            <text 
              x="50%" 
              y="50%" 
              font-family="Arial, sans-serif" 
              font-size="200" 
              font-weight="bold" 
              fill="#374151" 
              text-anchor="middle" 
              dominant-baseline="middle"
            >${initials}</text>
          </svg>`;
          
          const iconPath = path.join(iconDir, `${demoId}.svg`);
          await writeToAllLocations(iconPath, svgContent);
          logDebug(`Default icon created at ${iconPath}`);
        } catch (error) {
          logDebug('Error creating default icon', error);
          // Continue with the process even if icon creation fails
        }
      }
      
      // Create the demo page directory and page file
      try {
        const demoPageDir = path.join(process.cwd(), 'app', 'demos', demoId);
        await createDirectorySafely(demoPageDir);
        
        // Create the page.tsx file
        const componentName = demoId.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
        const pageContent = `"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DemoMarkdownDisplay from "@/components/demo-markdown-display";
import ${componentName}Assistant from "@/components/${demoId}-assistant";
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
      title="${assistantTitle}"
      leftContent={<${componentName}Assistant />}
      rightContent={<DemoMarkdownDisplay demoId="${demoId}" />}
    />
  );
}`;
        
        const pagePath = path.join(demoPageDir, 'page.tsx');
        await writeToAllLocations(pagePath, pageContent);
        logDebug(`Demo page created at ${pagePath}`);
        
        // Also create the create-success directory and ensure it exists
        const successDir = path.join(demoPageDir, 'create-success');
        await createDirectorySafely(successDir);
        
        // We don't need to create the page.tsx in success dir as it's a global component
        logDebug(`Success directory created at ${successDir}`);
      } catch (error) {
        logDebug('Error creating demo page', error);
        // Create a more detailed error message
        let errorDetails = 'Unknown error';
        if (error instanceof Error) {
          errorDetails = `${error.name}: ${error.message}\nStack: ${error.stack}`;
        }
        logDebug(`Detailed error information: ${errorDetails}`);
        
        // Don't fail the whole process, but log the error extensively
      }
      
      // Validate the created demo to ensure all files exist
      try {
        const validationResult = await validateDemoCreation(demoId);
        demoLogger.info(`Demo validation results for ${demoId}:`, validationResult);
        
        if (!validationResult.success) {
          demoLogger.warn(`Demo validation failed for ${demoId} - some required files may be missing`, validationResult.details);
        }
      } catch (error) {
        demoLogger.error(`Error validating demo creation for ${demoId}`, error);
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Demo created successfully',
        demoId
      });
    }
  } catch (error) {
    demoLogger.error(`Error in POST /api/upload`, error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
