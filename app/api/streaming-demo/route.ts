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
    
    // Create a streaming response using chat completions
    const stream = await openai.chat.completions.create({
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

    // Create a ReadableStream that emits SSE data
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Process each chunk in the stream
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
          
          // Send any remaining buffered content
          if (buffer) {
            const data = JSON.stringify({
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