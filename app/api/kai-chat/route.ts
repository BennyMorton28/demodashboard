import { NextRequest, NextResponse } from 'next/server';
import { KAI_PROMPT } from '@/lib/kai-prompt';
import OpenAI from 'openai';
import { createReadableStream, safeJsonEncode } from '@/lib/streaming';

// Create an OpenAI client instance
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// Log minimal configuration to verify setup
console.log("[KAI-DEBUG] API client configured with API key and organization ID");

/**
 * Handler for GET requests (used by EventSource in the client)
 */
export async function GET(req: NextRequest) {
  console.log("[KAI-DEBUG] GET request received");
  
  try {
    // Extract parameters from URL (for EventSource)
    const initParam = req.nextUrl.searchParams.get('init');
    if (!initParam) {
      console.log("[KAI-DEBUG] Missing init parameter");
      return NextResponse.json({ error: "Missing init parameter" }, { status: 400 });
    }
    
    // Parse from the URL parameter
    try {
      const parsedInit = JSON.parse(decodeURIComponent(initParam));
      const messages = parsedInit.messages || [];
      
      console.log("[KAI-DEBUG] Parsed messages count:", messages.length);
      return await streamResponse(messages);
    } catch (parseError) {
      console.error("[KAI-DEBUG] Error parsing init parameter:", parseError);
      return NextResponse.json({ error: "Invalid init parameter" }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[KAI-DEBUG] Error in KAI API GET handler:', error);
    return NextResponse.json({ 
      error: error?.message || "Unknown error"
    }, { status: 500 });
  }
}

/**
 * Handler for POST requests (used by direct fetch in the client)
 */
export async function POST(req: NextRequest) {
  console.log("[KAI-DEBUG] POST request received");
  
  try {
    // Parse from the request body
    const body = await req.json();
    const messages = body.messages || [];
    
    console.log("[KAI-DEBUG] Parsed messages count:", messages.length);
    
    return await streamResponse(messages);
  } catch (error: any) {
    console.error('[KAI-DEBUG] Error in KAI API POST handler:', error);
    return NextResponse.json({ 
      error: error?.message || "Unknown error"
    }, { status: 500 });
  }
}

/**
 * Common function to handle streaming responses for both GET and POST
 */
async function streamResponse(messages: any[]) {
  console.log("KAI chat streamResponse called");
  
  // Validate that messages is an array
  if (!Array.isArray(messages)) {
    console.error("Messages is not an array", messages);
    
    // Return a standardized error format
    return new Response(createEvent('error', {
      message: 'Invalid messages format: expected an array',
      type: 'validation_error',
      code: 400
    }), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
  
  // Add the system prompt if it's not already there
  if (messages.length === 0 || messages[0].role !== 'system') {
    messages = [{ role: 'system', content: KAI_PROMPT }, ...messages];
  }

  console.log(`Starting stream with ${messages.length} messages`);

  try {
    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        // Debug event
        controller.enqueue(createEvent('debug', { message: 'Stream started' }));
        
        try {
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            organization: process.env.OPENAI_ORG_ID,
          });
          
          // Call the OpenAI API with streaming enabled
          const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            stream: true,
          });
          
          let receivedSomeContent = false;
          
          // Process the streaming response
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            
            if (content) {
              receivedSomeContent = true;
              // Send content to client through our stream
              controller.enqueue(createEvent('response.output_text.delta', { delta: content }));
            }
          }
          
          // If we didn't receive any content, send a warning
          if (!receivedSomeContent) {
            controller.enqueue(createEvent('warning', { 
              message: 'The AI returned an empty response',
              type: 'content_warning',
              code: 204
            }));
          }
          
          // Send completion event
          controller.enqueue(createEvent('response.completed', { status: 'success' }));
        } catch (error: any) {
          console.error("Error streaming from OpenAI:", error);
          
          // Create a structured error object
          const errorObj: any = {
            message: error.message || "Unknown error occurred",
            type: 'openai_error',
            code: 500
          };
          
          // Handle specific OpenAI API errors
          if (error.status) {
            errorObj.code = error.status;
          }
          
          if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            errorObj.type = 'network_error';
            errorObj.message = 'Connection to AI service timed out';
          } else if (error.code === 'insufficient_quota' || error.code === 'rate_limit_exceeded') {
            errorObj.type = 'openai_quota_error';
            errorObj.code = 429;
          }
          
          controller.enqueue(createEvent('error', errorObj));
        } finally {
          controller.close();
        }
      }
    });

    // Return the stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error("Unexpected error in streamResponse:", error);
    
    // Return an error response
    return new Response(createEvent('error', {
      message: error.message || "Internal server error",
      type: 'server_error',
      code: 500
    }), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}

/**
 * Helper to create an SSE event
 */
function createEvent(event: string, data: any): string {
  return `event: ${event}\ndata: ${safeJsonEncode(data)}\n\n`;
} 