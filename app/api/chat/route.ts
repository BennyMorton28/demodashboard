import { NextResponse } from 'next/server';

// Simple response generator function - in a real app, this would call an AI service
function generateResponse(message: string): string {
  // List of possible responses based on keywords
  const responses = [
    {
      keywords: ['hello', 'hi', 'hey', 'greetings'],
      response: 'Hello! How can I help you today with the knowledge base?'
    },
    {
      keywords: ['about', 'who', 'what is'],
      response: 'Knowledge Assistant is a platform that combines AI chat support with a markdown content display. You can ask me questions about the content displayed on the right.'
    },
    {
      keywords: ['features', 'capabilities', 'can you', 'do you'],
      response: 'I can help answer questions about the content shown in the knowledge base. I can explain concepts, summarize information, and provide additional details on topics covered in the documentation.'
    },
    {
      keywords: ['how to', 'how do i', 'usage', 'use'],
      response: 'To use this assistant effectively, simply ask me questions related to the content displayed on the right. You can also switch between different content sections using the navigation buttons at the top of the content area.'
    }
  ];

  // Check if the message contains any keywords
  for (const item of responses) {
    if (item.keywords.some(keyword => message.toLowerCase().includes(keyword))) {
      return item.response;
    }
  }

  // Default response if no keywords match
  return `I see you're asking about "${message}". The information might be available in the knowledge base section on the right. If you have specific questions about that content, I'd be happy to help explain it.`;
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
    
    // In a real implementation, you would call your AI service here
    // For now, just generate a simple response
    const response = generateResponse(message);
    
    // Simulate a delay to make it feel more natural
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return NextResponse.json({
      response: response
    });
  } catch (error) {
    console.error('Error processing chat request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 