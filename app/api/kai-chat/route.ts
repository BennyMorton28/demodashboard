import { NextRequest, NextResponse } from 'next/server';
import { KAI_PROMPT } from '@/lib/kai-prompt';
import OpenAI from 'openai';
import { createReadableStream } from '@/lib/streaming';

// Log detailed OpenAI configuration information
console.log("KAI-CHAT CONFIG INFO:");
console.log("- OPENAI_ORG_ID from env:", `"${process.env.OPENAI_ORG_ID}"`);
console.log("- OPENAI_API_KEY from env:", `"${process.env.OPENAI_API_KEY?.slice(0, 4)}..."` + (process.env.OPENAI_API_KEY ? ` (length: ${process.env.OPENAI_API_KEY.length})` : ''));

// Create an OpenAI client instance
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// Log organization value after client creation for debugging
console.log("- OpenAI client config organization value:", openai.organization ? `"${openai.organization}"` : `"Not explicitly set"`);

// Verify the API key is working
console.log("Testing OpenAI API key...");
const apiKeyStart = process.env.OPENAI_API_KEY?.slice(0, 4) || "undefined";
const apiKeyLength = process.env.OPENAI_API_KEY?.length || 0;
console.log(`Using OpenAI API key starting with: ${apiKeyStart}...` + (apiKeyLength > 0 ? ` (length: ${apiKeyLength})` : ''));

/**
 * Handler for the /api/kai-chat endpoint
 * This provides a streaming interface to the Kellogg AI assistant
 */
export async function POST(req: NextRequest) {
  try {
    // Check for URL query parameter (for EventSource)
    const initParam = req.nextUrl.searchParams.get('init');
    let messages;
    
    if (initParam) {
      // Parse from the URL parameter for EventSource
      const parsedInit = JSON.parse(decodeURIComponent(initParam));
      messages = parsedInit.messages;
    } else {
      // Parse from the request body for direct fetch
      const body = await req.json();
      messages = body.messages;
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    // Add the system prompt if not already included
    if (messages.length === 0 || messages[0].role !== 'system') {
      messages = [
        { role: 'system', content: KAI_PROMPT },
        ...messages
      ];
    }

    console.log("Kai API call with messages:", JSON.stringify(messages));
    
    // Use the ReadableStream API to create a stream
    const stream = createReadableStream(async (controller) => {
      try {
        // Create and process the OpenAI stream
        const openaiStream = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
          stream: true,
          temperature: 0.7,
        });
        
        let eventCount = 0;
        
        // Process each event in the stream
        for await (const chunk of openaiStream) {
          eventCount++;
          const content = chunk.choices[0]?.delta?.content || '';
          
          if (content) {
            // Format the event for the client - simplified format
            const data = JSON.stringify({
              event: 'response.output_text.delta',
              data: {
                delta: content
              }
            });
            
            // Send the event as SSE format
            controller.enqueue(`data: ${data}\n\n`);
            
            // Log event count periodically
            if (eventCount <= 5 || eventCount % 20 === 0) {
              console.log(`Event ${eventCount}: content length ${content.length}`);
            }
          }
        }
        
        // Send a completion event
        controller.enqueue(`data: {"event":"response.completed","data":{}}\n\n`);
        controller.enqueue(`data: [DONE]\n\n`);
        controller.close();
      } catch (error: any) {
        console.error('Error in KAI API stream:', error);
        
        // Send error event
        const errorMessage = error?.message || "Unknown streaming error";
        controller.enqueue(`data: {"event":"error","data":{"message":"${errorMessage}"}}\n\n`);
        controller.close();
      }
    });
    
    // Return the stream with appropriate headers for Server-Sent Events
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in KAI API:', error);
    return NextResponse.json({ error: error?.message || "Unknown error" }, { status: 500 });
  }
} 