import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    console.log("API Key Test Route: Checking environment variables...");
    
    // Check if we have an API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("API Key Test: No OPENAI_API_KEY found in environment variables");
      return NextResponse.json({ 
        error: "No API key found", 
        environment: process.env.NODE_ENV 
      }, { status: 500 });
    }
    
    // Log key info (partially masked)
    const keyPrefix = process.env.OPENAI_API_KEY.substring(0, 10);
    const keySuffix = process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4);
    console.log(`API Key Test: Found key: ${keyPrefix}...${keySuffix} (length: ${process.env.OPENAI_API_KEY.length})`);
    
    // Initialize OpenAI client
    const openai = new OpenAI();
    
    // Test with a simple models list call
    console.log("API Key Test: Testing OpenAI API connection...");
    const models = await openai.models.list();
    
    return NextResponse.json({ 
      success: true, 
      message: `API key is valid. Found ${models.data.length} models.`,
      models: models.data.slice(0, 5).map(model => model.id),
      keyInfo: {
        prefix: keyPrefix,
        suffix: keySuffix,
        length: process.env.OPENAI_API_KEY.length
      }
    });
    
  } catch (error: any) {
    console.error("API Key Test: Error testing API key:", error);
    
    return NextResponse.json({ 
      error: "API key validation failed", 
      message: error.message,
      status: error.status,
      details: error.response?.data || "No additional details"
    }, { status: 500 });
  }
} 