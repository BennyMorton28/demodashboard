import { NextResponse } from 'next/server';
import { KAI_PROMPT } from '@/lib/kai-prompt';
import OpenAI from 'openai';

// Log detailed OpenAI configuration information
console.log("KAI-CHAT CONFIG INFO:");
console.log(`- OPENAI_ORG_ID from env: "${process.env.OPENAI_ORG_ID}"`);
if (process.env.OPENAI_API_KEY) {
  const apiKeyPrefix = process.env.OPENAI_API_KEY.substring(0, 10);
  console.log(`- OPENAI_API_KEY from env: "${apiKeyPrefix}..." (length: ${process.env.OPENAI_API_KEY.length})`);
} else {
  console.log(`- OPENAI_API_KEY from env: Not set`);
}

// Create an OpenAI client instance with API key only, no organization specified
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Don't specify organization, let OpenAI use the organization associated with the API key
});

// Debug info - Inspect the actual configuration the OpenAI client is using
console.log(`- OpenAI client config organization value: "${openai.organization || 'Not explicitly set'}"`);

// Test API key function
async function testOpenAIApiKey() {
  try {
    console.log("Testing OpenAI API key...");
    const models = await openai.models.list();
    console.log(`✅ API key is working! Found ${models.data.length} models.`);
    console.log(`Organization ID: ${process.env.OPENAI_ORG_ID || 'Not specified'}`);
    return true;
  } catch (error: any) {
    console.error("❌ API key validation failed:", error.message);
    if (error.status) console.error(`Status code: ${error.status}`);
    return false;
  }
}

// Run test on startup
testOpenAIApiKey().catch(err => console.error("API key test error:", err));

// Log API key info (but not the full key for security)
if (process.env.OPENAI_API_KEY) {
  const keyPrefix = process.env.OPENAI_API_KEY.substring(0, 10);
  console.log(`Using OpenAI API key starting with: ${keyPrefix}... (length: ${process.env.OPENAI_API_KEY.length})`);
} else {
  console.error("WARNING: No OPENAI_API_KEY found in environment variables!");
}

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
    
    // Log that we're using the Kai prompt from the file
    console.log(`Using Kai prompt (length: ${KAI_PROMPT.length} characters)`);
    console.log(`Processing message: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    try {
      // Create a streaming response from OpenAI
      console.log("Creating streaming response from OpenAI");
      const stream = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: KAI_PROMPT },
          { role: "user", content: message }
        ],
        stream: true, // Enable streaming
      });
      console.log("OpenAI stream created successfully");

      // Create a ReadableStream that emits SSE data
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            console.log("Starting to process stream events");
            let eventCount = 0;
            
            // Process each event in the stream
            for await (const chunk of stream) {
              eventCount++;
              const content = chunk.choices[0]?.delta?.content || '';
              
              if (content) {
                // Format the event for the client
                const data = JSON.stringify({
                  event: 'response.output_text.delta',
                  data: {
                    type: 'response.output_text.delta',
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
            
            console.log(`Stream complete, processed ${eventCount} events`);
            // Send DONE event to signal the end of stream
            controller.enqueue(`data: [DONE]\n\n`);
            controller.close();
          } catch (error) {
            console.error("Error in streaming loop:", error);
            
            // Send an error event to the client
            try {
              const errorEvent = {
                event: "error",
                data: {
                  message: error instanceof Error ? error.message : "Unknown streaming error"
                }
              };
              controller.enqueue(`data: ${JSON.stringify(errorEvent)}\n\n`);
              controller.enqueue(`data: [DONE]\n\n`);
            } catch (finalError) {
              console.error("Error sending error event:", finalError);
            }
            
            controller.close();
          }
        },
      });

      // Return the stream as a Response object with appropriate headers
      console.log("Returning stream response");
      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } catch (openaiError: any) {
      console.error("OpenAI API error:", openaiError);
      
      // Log more details about the error for debugging
      if (openaiError.error) {
        console.error("Error type:", openaiError.error.type);
        console.error("Error code:", openaiError.error.code);
        console.error("Organization ID:", openaiError.error.organization || "Not specified");
        console.error("Error message:", openaiError.error.message);
      }
      
      // For rate limit errors, provide a specific message
      if (openaiError.error?.type === 'tokens' && openaiError.error?.code === 'rate_limit_exceeded') {
        const waitTime = openaiError.error.message.match(/try again in (\d+\.\d+)s/)?.[1] || "a few seconds";
        
        return NextResponse.json(
          { 
            error: 'OpenAI rate limit exceeded',
            message: `Please wait ${waitTime} seconds and try again.`
          },
          { status: 429 }
        );
      }
      
      // For other OpenAI errors
      return NextResponse.json(
        { 
          error: 'OpenAI API error',
          message: openaiError instanceof Error ? openaiError.message : "Unknown error processing request"
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing Kai chat request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 