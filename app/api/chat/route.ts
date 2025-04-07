import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { existsSync } from 'fs';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Let the API use the organization associated with the API key
});

// Enhanced logging for debugging
const logDebug = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? data : '');
};

export async function POST(req: NextRequest) {
  try {
    // Get the message and demo ID from the request
    const { message, demoId = 'knowledge-assistant' } = await req.json();
    
    logDebug(`Chat request received for demo: ${demoId}`, { message: message.substring(0, 50) + (message.length > 50 ? '...' : '') });
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get the system prompt for the specified demo
    const systemPrompt = await getSystemPrompt(demoId);
    logDebug(`Retrieved system prompt for ${demoId}`, { promptLength: systemPrompt.length });
    
    // Create a stream to write the response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Create a streaming response
    const streamingResponse = new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
    
    // Start the OpenAI streaming request in the background
    streamOpenAIResponse(message, systemPrompt, writer, demoId).catch(error => {
      console.error('Error in OpenAI streaming:', error);
      writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            choices: [{ delta: { content: `Error: ${error.message || 'Unknown error occurred'}` } }]
          })}\n\n`
        )
      );
      writer.write(encoder.encode(`data: [DONE]\n\n`));
      writer.close();
    });
    
    return streamingResponse;
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}

// Helper function to get the system prompt for a demo
async function getSystemPrompt(demoId: string): Promise<string> {
  // First, look for a custom prompt file
  const promptFilePath = path.join(process.cwd(), 'lib', 'prompts', `${demoId}-prompt.md`);
  
  if (existsSync(promptFilePath)) {
    logDebug(`Found custom prompt file for ${demoId}: ${promptFilePath}`);
    const promptContent = fs.readFileSync(promptFilePath, 'utf-8');
    return promptContent;
  }
  
  logDebug(`No custom prompt file found for ${demoId}, using fallback`);
  
  // Fallback prompts for built-in demos
  switch (demoId) {
    case 'knowledge-assistant':
      return `
        You are a helpful Knowledge Assistant that answers questions about the content displayed on the right side of the screen.
        
        Your primary purpose is to:
        1. Help users understand the information being displayed
        2. Answer questions about the content
        3. Guide users to relevant sections if they're looking for specific information
        4. Provide additional context or explanations when needed
        
        Approach all questions with a helpful, informative tone. If asked about information not available in the displayed content, politely suggest checking the available tabs or asking a question related to the current content.
        
        Avoid making up information that isn't supported by the content. If you're unsure about something, acknowledge this and suggest where the user might find that information.
      `;
    case 'kai':
      return fs.readFileSync(path.join(process.cwd(), 'lib', 'prompts', 'kai-prompt.md'), 'utf-8');
    default:
      return `
        You are a helpful AI assistant. Answer the user's questions thoroughly and accurately.
        If you don't know something, be honest about it rather than making up information.
      `;
  }
}

// Text encoder to convert strings to Uint8Array
const encoder = new TextEncoder();

// Helper function to stream OpenAI response
async function streamOpenAIResponse(
  message: string, 
  systemPrompt: string, 
  writer: WritableStreamDefaultWriter<any>,
  demoId: string
) {
  try {
    logDebug(`Starting OpenAI stream for ${demoId}`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      stream: true,
    });
    
    let fullResponse = '';
    let chunkCount = 0;
    
    // Send a first empty delta to initialize the response
    const initialEvent = {
      choices: [{ delta: { content: "" } }]
    };
    writer.write(encoder.encode(`data: ${JSON.stringify(initialEvent)}\n\n`));
    
    // Process each chunk as it arrives
    for await (const chunk of completion) {
      chunkCount++;
      
      // Extract the text from the chunk
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      
      // Format in OpenAI completion format for compatibility
      const formattedEvent = {
        choices: [{ delta: { content } }]
      };
      
      // Write the formatted chunk to the stream
      writer.write(encoder.encode(`data: ${JSON.stringify(formattedEvent)}\n\n`));
      
      // Log occasionally for debugging
      if (chunkCount % 20 === 0) {
        logDebug(`Streamed ${chunkCount} chunks so far for ${demoId}`);
      }
    }
    
    // Send completion signal
    writer.write(encoder.encode(`data: [DONE]\n\n`));
    logDebug(`Streaming completed for ${demoId}: ${chunkCount} chunks, ${fullResponse.length} chars`);
  } catch (error: any) {
    console.error(`Error in OpenAI request for ${demoId}:`, error);
    writer.write(
      encoder.encode(
        `data: ${JSON.stringify({
          choices: [{ delta: { content: `Error: ${error.message || 'Unknown error occurred'}` } }]
        })}\n\n`
      )
    );
    writer.write(encoder.encode(`data: [DONE]\n\n`));
  } finally {
    writer.close();
  }
} 