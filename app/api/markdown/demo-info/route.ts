import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { existsSync } from 'fs';

export async function GET(request: Request) {
  // Get the demo ID and section from the URL parameters
  const { searchParams } = new URL(request.url);
  const demoId = searchParams.get('demo') || 'knowledge-assistant';
  const section = searchParams.get('section') || 'default';
  
  try {
    // Define the path to the markdown file based on the section requested
    let filePath = '';
    
    if (section === 'default') {
      filePath = path.join(process.cwd(), 'public', 'markdown', demoId, 'content.md');
    } else if (section === 'prompt') {
      filePath = path.join(process.cwd(), 'public', 'markdown', demoId, 'prompt-info.md');
    } else if (section === 'implementation') {
      filePath = path.join(process.cwd(), 'public', 'markdown', demoId, 'implementation.md');
    } else {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }
    
    // Check if the requested file exists
    if (!existsSync(filePath)) {
      // If the file doesn't exist, check if this is one of the legacy demos
      // with content still embedded in the code
      if (demoId === 'knowledge-assistant' || demoId === 'bmsd-case-study' || 
          demoId === 'kai' || demoId === 'case-study') {
        // Handle legacy demos with embedded content
        const content = getLegacyDemoContent(demoId, section);
        if (!content) {
          return NextResponse.json(
            { error: 'Demo content not found' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          id: demoId,
          section: section,
          content: content
        });
      }
      
      return NextResponse.json(
        { error: 'Demo not found' },
        { status: 404 }
      );
    }
    
    // Read the content from the file
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Return the requested content
    return NextResponse.json({
      id: demoId,
      section: section,
      content: content
    });
  } catch (error) {
    console.error('Error fetching demo info:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching demo info' },
      { status: 500 }
    );
  }
}

// Helper function to retrieve content for legacy demos that have embedded content
function getLegacyDemoContent(demoId: string, section: string): string {
  // Legacy demo content - in a real application this would be moved to separate files
  const demoInfoSamples: Record<string, Record<string, string>> = {
  "knowledge-assistant": {
    default: `
# Knowledge Assistant Demo

This demo showcases an AI assistant that can answer questions about the content displayed on the right side of the screen.

## Overview

The Knowledge Assistant provides an interactive chat experience combined with a knowledge base. This setup is ideal for scenarios where users might need explanations or additional information about displayed content.

## Features

- **Interactive Chat**: Ask questions and get responses from the AI assistant
- **Tabbed Content**: Navigate between different sections of the knowledge base
- **Responsive Design**: Works well on both desktop and mobile devices
- **Real-time Responses**: Get answers quickly without page refreshes

## Use Cases

- Customer support portals
- Documentation websites
- Educational platforms
- Training materials

## How It Works

The assistant on the left side processes your questions and provides answers based on the content available in the knowledge base. It can also help navigate you to the right section of the content if needed.

## Technical Implementation

This demo is built using:
- Next.js for the frontend and API routes
- React for the UI components
- Tailwind CSS for styling
- API routes for backend functionality
`,

    prompt: `
# The Knowledge Assistant Prompt

The assistant uses the following system prompt to guide its responses:

\`\`\`
You are a helpful Knowledge Assistant that answers questions about the content displayed on the right side of the screen.

Your primary purpose is to:
1. Help users understand the information being displayed
2. Answer questions about the content
3. Guide users to relevant sections if they're looking for specific information
4. Provide additional context or explanations when needed

Approach all questions with a helpful, informative tone. If asked about information not available in the displayed content, politely suggest checking the available tabs or asking a question related to the current content.

Avoid making up information that isn't supported by the content. If you're unsure about something, acknowledge this and suggest where the user might find that information.
\`\`\`

This prompt ensures the assistant stays focused on helping with the content while providing a good user experience.
`,

    implementation: `
# Implementation Details

## Frontend Components

The Knowledge Assistant demo consists of several key components:

\`\`\`jsx
// Main layout with split view
<div className="flex">
  <div className="w-1/2">
    <Assistant /> // Chat interface
  </div>
  <div className="w-1/2">
    <MarkdownDisplay /> // Content display
  </div>
</div>
\`\`\`

## Backend API

The backend uses API routes to handle:
1. Chat messages (POST /api/chat)
2. Content retrieval (GET /api/markdown)

## State Management

The chat history is maintained in the Assistant component's state:

\`\`\`jsx
const [messages, setMessages] = useState<Item[]>([]);
\`\`\`

## Responsive Design

For mobile devices, the interface switches to a tabbed layout instead of a split view:

\`\`\`jsx
// Mobile tabs
<div className="md:hidden">
  <button onClick={() => setActiveTab('chat')}>Assistant</button>
  <button onClick={() => setActiveTab('content')}>Content</button>
</div>
\`\`\`

## Future Improvements

Potential enhancements include:
- Adding search functionality to the content area
- Supporting multimedia content in the knowledge base
- Implementing user preferences and history
`
  },
  "kai": {
    default: `
# Kai (Kellogg AI) Assistant

Kai is an AI assistant designed specifically to support Kellogg School of Management students, staff, and faculty with a wide range of needs.

## About Kai

Kai combines comprehensive knowledge about Kellogg's programs, resources, policies, and culture with advanced conversational capabilities to provide personalized assistance to the Kellogg community.

## Capabilities

- **Program Information**: Details about Kellogg's various MBA programs, requirements, and application processes
- **Course Guidance**: Help with course selection, prerequisites, and registration
- **Career Resources**: Information on recruiting processes, career resources, and alumni connections
- **Campus Life**: Details about clubs, events, and opportunities at Kellogg
- **Administrative Support**: Help with common procedures, deadlines, and policies

## Use Cases

- Prospective students exploring Kellogg programs
- Current students seeking academic or career guidance
- Staff and faculty looking for quick information access
- Alumni connecting with Kellogg resources and networks

## Benefits

- 24/7 access to Kellogg-specific information
- Personalized recommendations based on individual needs
- Consistent and accurate information
- Seamless connection to human support when needed

Kai represents a new way to engage with and access the wealth of knowledge and resources available at Kellogg School of Management.
`,
    prompt: `
# Kai's System Prompt

Kai is powered by a carefully crafted system prompt that defines its personality, knowledge scope, and interaction style:

\`\`\`
You are Kai, the Kellogg School of Management AI assistant. You have deep knowledge about Kellogg's programs, resources, faculty, traditions, and culture.

Your primary purpose is to:
1. Provide accurate information about Kellogg's degree programs
2. Assist with course selection and academic planning
3. Share insights about career opportunities and the recruiting process
4. Help students navigate campus resources and activities
5. Support the Kellogg community with administrative processes

When responding:
- Be friendly, professional, and knowledgeable
- Reference specific Kellogg programs, courses, and resources when relevant
- Respond honestly when you don't know something, offering to connect users with human resources
- Communicate in a manner that reflects Kellogg's collaborative and inclusive culture
- Provide concise yet thorough responses that respect the user's time

Remember that you represent Kellogg School of Management in every interaction.
\`\`\`

This prompt ensures that Kai maintains Kellogg's professional standards while providing helpful, accurate information that serves the specific needs of the Kellogg community.
`,
    implementation: `
# Implementation Details

## Specialized Knowledge Base

Kai is built with:

\`\`\`
1. A foundation model fine-tuned on Kellogg-specific content
2. Integration with Kellogg's information systems
3. Regular updates to reflect current programs and policies
\`\`\`

## User Interface

The interface features:

\`\`\`jsx
// Chat interface with Kellogg branding
<div className="kellogg-theme">
  <ChatHeader logo={KelloggLogo} title="Kai - Kellogg AI Assistant" />
  <ChatMessages messages={conversation} />
  <ChatInput 
    onSendMessage={handleMessage} 
    placeholder="Ask Kai about Kellogg..." 
  />
</div>
\`\`\`

## Authentication Integration

Kai can integrate with Kellogg's authentication systems:

\`\`\`javascript
// Example of user role-based customization
function getPersonalizedPrompt(user) {
  if (user.role === "student") {
    return generateStudentPrompt(user.program, user.year);
  } else if (user.role === "faculty") {
    return generateFacultyPrompt(user.department);
  }
  // etc.
}
\`\`\`

## Future Enhancements

Potential improvements include:
- Calendar integration for scheduling assistance
- Course registration support
- Personalized career pathway recommendations
- Alumni networking features
- Multilingual support for international students
`
  }
};

  // For brevity, I've only included "knowledge-assistant" and "kai" demos
  // Add more legacy demos as needed
  
  if (!demoInfoSamples[demoId]) {
    return '';
  }
  
  const demoInfo = demoInfoSamples[demoId];
  if (!demoInfo[section]) {
    return '';
  }
  
  return demoInfo[section];
} 