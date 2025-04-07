import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Create an OpenAI client instance
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { message } = data;
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    console.log("KAI TEST: Processing message:", message);
    
    // Create a streaming response from OpenAI with a simplified prompt
    console.log("KAI TEST: Creating streaming response from OpenAI");
    const stream = await openai.responses.create({
      model: "gpt-4o",
      instructions: "You are a helpful assistant for Kellogg School of Management. Keep your responses brief.",
      input: message,
      stream: true, // Enable streaming
    });
    console.log("KAI TEST: OpenAI stream created successfully");

    // Create a ReadableStream that emits SSE data
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          console.log("KAI TEST: Starting to process stream events");
          let eventCount = 0;
          
          // Process each event in the stream
          for await (const event of stream) {
            eventCount++;
            
            // Special logging for delta events to check structure
            if (event.type === 'response.output_text.delta') {
              console.log("DELTA EVENT STRUCTURE:", JSON.stringify(event, null, 2));
              // Add detailed property inspection
              console.log("DELTA EVENT PROPERTIES:");
              console.log("- type:", event.type);
              console.log("- item_id:", event.item_id);
              console.log("- output_index:", event.output_index);
              console.log("- content_index:", event.content_index);
              console.log("- delta:", event.delta);
            }
            
            // Format the event with type and data for the client
            const data = JSON.stringify({
              event: event.type,
              data: event,
            });
            
            // Log event types (but not all content to avoid cluttering logs)
            if (eventCount <= 5 || eventCount % 20 === 0) {
              console.log(`KAI TEST: Event ${eventCount}: ${event.type}`);
            }
            
            // Send the event as SSE format
            controller.enqueue(`data: ${data}\n\n`);
          }
          
          console.log(`KAI TEST: Stream complete, processed ${eventCount} events`);
          // Send DONE event to signal the end of stream
          controller.enqueue(`data: [DONE]\n\n`);
          controller.close();
        } catch (error) {
          console.error("KAI TEST: Error in streaming loop:", error);
          controller.error(error);
        }
      },
    });

    // Return the stream as a Response object with appropriate headers
    console.log("KAI TEST: Returning stream response");
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error('KAI TEST: Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 