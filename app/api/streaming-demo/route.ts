import { NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * API route for demonstrating OpenAI's streaming responses feature
 * This endpoint streams the model's response as Server-Sent Events (SSE)
 */
export async function POST(request: Request) {
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
    
    // Create a streaming response
    const stream = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: message,
        },
      ],
      stream: true, // Enable streaming
    });

    // Create a ReadableStream that emits SSE data
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Process each event in the stream
          for await (const event of stream) {
            // Format the event with type and data for the client
            const data = JSON.stringify({
              event: event.type,
              data: event,
            });
            
            // Send the event as SSE format
            controller.enqueue(`data: ${data}\n\n`);
          }
          
          // Send DONE event to signal the end of stream
          controller.enqueue(`data: [DONE]\n\n`);
          controller.close();
        } catch (error) {
          console.error("Error in streaming loop:", error);
          controller.error(error);
        }
      },
    });

    // Return the stream as a Response object with appropriate headers
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in streaming demo:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 