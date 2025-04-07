import { NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * API route for demonstrating OpenAI's streaming responses feature
 * This endpoint streams the model's response as Server-Sent Events (SSE)
 */
export async function POST(request: Request) {
  const encoder = new TextEncoder();
  let buffer = '';
  const FLUSH_AFTER_CHARS = 20; // Flush buffer after ~4-5 words
  
  try {
    // Parse the request body
    const { message } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Initialize the OpenAI client
    const openai = new OpenAI();
    
    // Determine if we should use the new API format (responses) or legacy format (chat.completions)
    const useNewAPIFormat = process.env.USE_NEW_API_FORMAT === 'true';
    
    let stream;
    
    if (useNewAPIFormat) {
      // New API format
      console.log("Using new OpenAI API format (responses)");
      stream = await openai.responses.create({
        model: "gpt-4o",
        input: [
          {
            role: "user",
            content: message,
          },
        ],
        stream: true,
        temperature: 0.7,
      });
    } else {
      // Legacy API format
      console.log("Using legacy OpenAI API format (chat.completions)");
      stream = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      });
    }

    // Create a ReadableStream that emits SSE data
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          if (useNewAPIFormat) {
            // Process stream from new API format
            for await (const event of stream) {
              if (event.type === 'response.output_text.delta') {
                const content = event.data.delta;
                if (content) {
                  // Add to buffer
                  buffer += content;
                  
                  // Flush buffer if it's long enough or contains sentence-ending punctuation
                  if (buffer.length >= FLUSH_AFTER_CHARS || /[.!?]\s*$/.test(buffer)) {
                    // Pass through the original event format for compatibility
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                    buffer = ''; // Clear buffer after sending
                  }
                }
              } else {
                // Pass through other event types
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
              }
            }
          } else {
            // Process stream from legacy API format
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                // Add to buffer
                buffer += content;
                
                // Flush buffer if it's long enough or contains sentence-ending punctuation
                if (buffer.length >= FLUSH_AFTER_CHARS || /[.!?]\s*$/.test(buffer)) {
                  // Format the event with type and data for the client
                  const data = JSON.stringify({
                    event: 'content.chunk',
                    data: {
                      content: buffer
                    }
                  });
                  
                  // Send the event as SSE format
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  buffer = ''; // Clear buffer after sending
                }
              }
            }
          }
          
          // Send any remaining buffered content
          if (buffer) {
            const data = useNewAPIFormat
              ? JSON.stringify({
                  event: 'response.output_text.delta',
                  data: {
                    delta: buffer
                  }
                })
              : JSON.stringify({
                  event: 'content.chunk',
                  data: {
                    content: buffer
                  }
                });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          
          // Send DONE event to signal the end of stream
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Error in streaming loop:", error);
          
          // Send error event to client
          const errorEvent = JSON.stringify({
            event: 'error',
            data: {
              message: error instanceof Error ? error.message : "Unknown streaming error"
            }
          });
          controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      },
    });

    // Return the stream as a Response object with appropriate headers
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no" // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error("Error in streaming demo:", error);
    
    // Check for specific OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      const status = error.status || 500;
      const message = error.message || "OpenAI API error";
      
      return NextResponse.json(
        { error: message },
        { status }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 