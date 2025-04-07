import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-dev'
});

// Enhanced logging for debugging
const logDebug = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? data : '');
};

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    const { message, demoId, assistantId } = body;
    
    if (!message || !demoId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, demoId' },
        { status: 400 }
      );
    }

    console.log(`Received message for demo ${demoId}${assistantId ? `, assistant ${assistantId}` : ''}: ${message.substring(0, 50)}...`);
    
    // Determine which prompt file to use
    let promptFile;
    if (assistantId !== undefined) {
      // Multi-assistant: use assistant-specific prompt file
      promptFile = path.join(process.cwd(), 'lib', 'prompts', `${demoId}-assistant-${assistantId}-prompt.md`);
    } else {
      // Single assistant: use demo prompt file
      promptFile = path.join(process.cwd(), 'lib', 'prompts', `${demoId}-prompt.md`);
    }
    
    // Check if prompt file exists
    if (!existsSync(promptFile)) {
      console.error(`Prompt file not found: ${promptFile}`);
      return NextResponse.json(
        { error: 'Prompt file not found' },
        { status: 404 }
      );
    }
    
    // Read the prompt file
    const promptContent = await readFile(promptFile, 'utf8');
    
    // Set up streaming capabilities
    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: promptContent },
        { role: 'user', content: message }
      ],
      stream: true,
    });
    
    // Create a readable stream
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            const jsonData = { 
              choices: [{ 
                delta: { content }
              }] 
            };
            controller.enqueue(`data: ${JSON.stringify(jsonData)}\n\n`);
          }
        }
        controller.enqueue(`data: [DONE]\n\n`);
        controller.close();
      }
    });
    
    // Return the stream
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('Error in POST /api/chat:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 