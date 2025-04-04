import { NextResponse } from 'next/server';
import { KAI_PROMPT, getCustomizedKaiPrompt } from '@/lib/kai-prompt';

// Simple response generator function - in a real app, this would call an AI service with Kai's prompt
function generateKaiResponse(message: string): string {
  // List of possible responses based on keywords
  const responses = [
    {
      keywords: ['hello', 'hi', 'hey', 'greetings'],
      response: 'Hello there! I\'m Kai, your Kellogg AI assistant. How can I help you with Kellogg-related questions today?'
    },
    {
      keywords: ['mba', 'program', 'degree', 'programs'],
      response: 'Kellogg offers several MBA programs, including the Full-Time MBA, Evening & Weekend MBA, Executive MBA, and MMM Program (dual-degree MBA and MS in Design Innovation). Each program is designed to fit different career stages and goals. Would you like more specific information about any of these programs?'
    },
    {
      keywords: ['career', 'job', 'recruiting', 'employment', 'hire'],
      response: 'Kellogg graduates pursue diverse career paths, with many going into consulting, technology, finance, and marketing. Our Career Management Center provides personalized coaching, recruiter connections, and resources to help you achieve your career goals. For recruiting preparation, I recommend starting early by networking, attending company presentations, and working with career coaches on your resume and interview skills.'
    },
    {
      keywords: ['course', 'classes', 'elective', 'curriculum', 'marketing'],
      response: 'For students interested in marketing, Kellogg offers excellent electives like Consumer Behavior, Marketing Analytics, Brand Strategy, and Digital Marketing Strategies. These courses would provide both strategic and tactical marketing knowledge. I\'d recommend speaking with a student advisor to align these with your specific career goals.'
    },
    {
      keywords: ['clubs', 'activities', 'extracurricular', 'groups'],
      response: 'Kellogg has over 100 student clubs and organizations, ranging from professional interests (Consulting Club, Marketing Club, Tech Club) to cultural, athletic, and special interest groups. Getting involved in clubs is one of the best ways to build your network and develop leadership skills during your time at Kellogg.'
    }
  ];

  // Check if the message contains any keywords
  for (const item of responses) {
    if (item.keywords.some(keyword => message.toLowerCase().includes(keyword))) {
      return item.response;
    }
  }

  // Default response if no keywords match
  return `That's a great question about Kellogg. While I'm just a demo, a real implementation would provide detailed information about Kellogg programs, career support, courses, and student life. Is there something specific about Kellogg you'd like to know?`;
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
    
    // In a real implementation, you would call your AI service here with the Kai prompt
    // For example:
    // const prompt = getCustomizedKaiPrompt(userContext);
    // const aiResponse = await callAIService(prompt, message);
    
    // For now, just generate a simple response
    const response = generateKaiResponse(message);
    
    // Simulate a delay to make it feel more natural
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log that we're using the prompt from the file (in a real implementation)
    console.log(`Using Kai prompt (length: ${KAI_PROMPT.length} characters)`);
    
    return NextResponse.json({
      response: response
    });
  } catch (error) {
    console.error('Error processing Kai chat request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 