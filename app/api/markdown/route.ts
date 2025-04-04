import { NextResponse } from 'next/server';

// Sample markdown content - in a real application this would come from a database
const markdownSamples = {
  default: `
# Welcome to Knowledge Assistant

This is a demonstration of the Knowledge Assistant platform. The interface is split into two main sections:

## Left Side: AI Assistant

On the left side, you can interact with our AI assistant. Ask questions, get information, or request help with your tasks.

## Right Side: Knowledge Base

This area displays relevant information in markdown format. Content here can be updated by administrators to provide up-to-date information and resources.

### Features

- Real-time AI assistance
- Markdown-formatted knowledge base
- Seamless integration between both components

Feel free to explore and ask the assistant any questions you may have!
`,
  about: `
# About Knowledge Assistant

Knowledge Assistant is a powerful tool that combines AI-driven chat support with a customizable knowledge base.

## Our Vision

We believe that merging interactive AI with structured knowledge creates a more effective learning and support experience.

## How It Works

1. **AI Assistance**: Our assistant processes natural language queries and provides relevant responses.
2. **Knowledge Integration**: The markdown display shows contextual information that complements the AI assistant.
3. **Continuous Learning**: The system improves over time based on interactions and feedback.

## Use Cases

- **Customer Support**: Provide instant assistance while displaying relevant documentation.
- **Education**: Create interactive learning experiences with supporting materials.
- **Internal Knowledge Management**: Help employees find and understand company resources.

For more information, contact our support team.
`,
  features: `
# Key Features

## Knowledge Assistant Platform

### AI Capabilities

- **Natural Language Processing**: Understanding complex user queries
- **Context Awareness**: Maintaining conversation history for better responses
- **Multimodal Support**: Handling text, links, and future support for other media

### Content Management

- **Markdown Support**: Rich text formatting for knowledge base content
- **Dynamic Content**: Update content in real-time
- **Content Organization**: Structure information in a user-friendly way

### Technical Features

- **Fast Response Times**: Optimized for quick loading and interaction
- **Customizable Design**: Adaptable to your branding and preferences
- **Integration Options**: Connect with your existing systems

### Security & Compliance

- **Data Protection**: Enterprise-grade security measures
- **Privacy Controls**: Manage what information is shared and stored
- **Compliance Friendly**: Designed with regulatory requirements in mind

Contact us to learn how these features can be tailored to your needs.
`
};

export async function GET(request: Request) {
  // Get the content ID from the URL parameters
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'default';
  
  // Check if the requested content exists
  if (!markdownSamples[id as keyof typeof markdownSamples]) {
    return NextResponse.json(
      { error: 'Content not found' },
      { status: 404 }
    );
  }
  
  // Return the requested markdown content
  return NextResponse.json({
    id,
    content: markdownSamples[id as keyof typeof markdownSamples]
  });
}

export async function POST(request: Request) {
  // This would be where you could implement an API to update content
  // For this example, we'll just return a success message
  
  try {
    const data = await request.json();
    
    // In a real implementation, you would validate and save the data
    // For now, just return success
    
    return NextResponse.json({
      success: true,
      message: 'Content updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
} 