import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Create an OpenAI client instance with default configuration
const openai = new OpenAI();

// Log key info for debugging
if (process.env.OPENAI_API_KEY) {
  const keyPrefix = process.env.OPENAI_API_KEY.substring(0, 10);
  console.log(`Alt API: Using key starting with: ${keyPrefix}... (length: ${process.env.OPENAI_API_KEY.length})`);
} else {
  console.error("Alt API: No OpenAI API key found in environment variables!");
}

// Test API key at startup
async function testApiKey() {
  try {
    const models = await openai.models.list();
    console.log(`Alt API: API key is valid! Found ${models.data.length} models.`);
    return true;
  } catch (error: any) {
    console.error("Alt API: API key validation failed:", error.message);
    return false;
  }
}

// Run test immediately
testApiKey().catch(err => console.error("Alt API: Test error:", err));

// In the POST handler, add a fallback in case the gpt-3.5-turbo model also fails
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
    
    console.log(`Alt API: Processing message: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    // Try with different models in sequence if they fail
    const modelsToTry = ["gpt-3.5-turbo", "gpt-3.5-turbo-16k"];
    let lastError: Error | null = null;
    
    for (const model of modelsToTry) {
      try {
        console.log(`Alt API: Trying model ${model}...`);
        
        const response = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system", 
              content: "You are Kai, a helpful assistant for Kellogg School of Management students. Be concise and helpful."
            },
            { role: "user", content: message }
          ],
          max_tokens: 500,
        });
        
        console.log(`Alt API: Successfully generated response with ${model}`);
        
        // Return the response text
        return NextResponse.json({
          response: response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.",
          model: model,
          usage: response.usage
        });
      } catch (error: any) {
        lastError = error;
        console.error(`Alt API: Error with model ${model}:`, error.message);
        
        // If this isn't the last model to try, continue to the next one
        if (model !== modelsToTry[modelsToTry.length - 1]) {
          console.log(`Alt API: Trying next model...`);
          continue;
        }
      }
    }
    
    // If we get here, all models failed
    console.error("Alt API: All models failed. Last error:", lastError);
    
    // Generate a hardcoded response as a last resort
    return NextResponse.json({
      response: "I'm experiencing some technical difficulties right now. This is a fallback response to let you know that the API key seems to be working, but there might be an issue with the OpenAI service or rate limits. Please try again in a few moments.",
      model: "fallback",
      error: lastError?.message || "All models failed"
    });
  } catch (error: any) {
    console.error('Alt API: Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 