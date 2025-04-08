import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Simple plain text response, not streaming
  return new NextResponse('This is a simple test response', {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

export async function POST(req: NextRequest) {
  // Echo back the request body
  try {
    const body = await req.json();
    return NextResponse.json({ 
      message: 'Echo response',
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Invalid JSON',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
} 