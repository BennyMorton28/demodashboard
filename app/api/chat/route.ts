import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { existsSync } from 'fs';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

export async function POST(req: NextRequest) {
  try {
    // Get the message and demo ID from the request
    const { message, demoId = 'knowledge-assistant' } = await req.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get the system prompt for the specified demo
    const systemPrompt = await getSystemPrompt(demoId);
    
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
    streamOpenAIResponse(message, systemPrompt, writer).catch(error => {
      console.error('Error in OpenAI streaming:', error);
      writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            event: 'error',
            data: { message: error.message || 'Unknown error occurred' },
          })}\n\n`
        )
      );
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
    return fs.readFileSync(promptFilePath, 'utf-8');
  }
  
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
async function streamOpenAIResponse(message: string, systemPrompt: string, writer: WritableStreamDefaultWriter<any>) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      stream: true,
    });
    
    let fullResponse = '';
    
    // Process each chunk as it arrives
    for await (const chunk of completion) {
      // Extract the text from the chunk
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      
      // Format the chunk for SSE
      const event = {
        event: 'response.output_text.delta', 
        data: {
          type: 'response.output_text.delta',
          delta: content,
        },
      };
      
      // Write the formatted chunk to the stream
      writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    }
    
    // Send an 'done' event
    writer.write(
      encoder.encode(
        `data: ${JSON.stringify({
          event: 'done',
          data: {},
        })}\n\n`
      )
    );
  } catch (error: any) {
    console.error('Error in OpenAI request:', error);
    writer.write(
      encoder.encode(
        `data: ${JSON.stringify({
          event: 'error',
          data: { message: error.message || 'Unknown error occurred' },
        })}\n\n`
      )
    );
  } finally {
    writer.close();
  }
} 