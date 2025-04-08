import { NextRequest, NextResponse } from 'next/server';
import { createReadableStream, safeJsonEncode } from '@/lib/streaming';

// Simple test API route to verify streaming functionality
export async function GET(req: NextRequest) {
  console.log("[TEST-KAI] Streaming test route called via GET");
  return createTestStream();
}

// Support POST for direct fetch API calls
export async function POST(req: NextRequest) {
  console.log("[TEST-KAI] Streaming test route called via POST");
  
  // You can read the body here if needed
  try {
    const body = await req.json();
    console.log("[TEST-KAI] Received body:", body);
  } catch (error) {
    console.log("[TEST-KAI] No valid JSON body received");
  }
  
  return createTestStream();
}

// Helper function to create a streaming response
function createTestStream() {
  // Create a ReadableStream to test streaming
  const stream = createReadableStream(async (controller) => {
    try {
      // Send several messages with delays to simulate streaming
      const words = ["Hello", " world", ",", " this", " is", " a", " streaming", " test", ".", " Working", " now", "?"];
      
      for (let i = 0; i < words.length; i++) {
        // Create a simple event with a single word
        const eventData = {
          event: 'response.output_text.delta',
          data: {
            delta: words[i]
          }
        };
        
        // Send the event in SSE format
        const formattedData = `data: ${safeJsonEncode(eventData)}\n\n`;
        controller.enqueue(formattedData);
        console.log(`[TEST-KAI] Sent word: "${words[i]}"`);
        
        // Wait a short time to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Send completion event
      console.log("[TEST-KAI] Sending completion events");
      controller.enqueue(`data: ${safeJsonEncode({event:"response.completed",data:{}})}\n\n`);
      // Small delay before DONE
      await new Promise(resolve => setTimeout(resolve, 100));
      controller.enqueue(`data: [DONE]\n\n`);
    } catch (error) {
      console.error('[TEST-KAI] Error in test stream:', error);
      controller.enqueue(`data: ${safeJsonEncode({
        event: "error",
        data: { message: "Test error occurred" }
      })}\n\n`);
    }
  });
  
  // Return the stream with appropriate SSE headers
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
} 