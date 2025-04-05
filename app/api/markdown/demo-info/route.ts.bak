import { NextResponse } from 'next/server';

// Demo information content - in a real application this would come from a database
const demoInfoSamples = {
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
  "bmsd-case-study": {
    default: `
# BMSD Transportation Case Study

This interactive case study allows you to explore the transportation challenges facing Burlington-Montague School District (BMSD) through conversations with key stakeholders.

## Overview

The BMSD Transportation Case Study is designed to help you understand a complex educational system challenge from multiple perspectives. By interacting with different characters, you'll gain insights into the various concerns, priorities, and potential solutions to BMSD's transportation crisis.

## Key Characters

- **Dr. Emily Carter** - Superintendent
- **Ms. Linda Johnson** - Bus Driver with 15 years of experience
- **Mr. David Rodriguez** - Principal of Burlington East High School
- **Ms. Sarah Lee** - Chief Operations Officer
- **Mr. James Thompson** - Chief Financial Officer

## The Challenge

BMSD is facing a transportation crisis affecting student attendance and educational equity. The district must balance:
- Budget constraints
- Student access to education
- Driver shortages and working conditions
- Maintenance issues with aging buses
- Rising fuel costs

## How to Use This Demo

1. Select a character using the character selector
2. Ask questions about their perspective on the transportation crisis
3. Switch between characters to understand different viewpoints
4. Use the information to develop a comprehensive understanding of the situation

Each character has unique knowledge, priorities, and concerns based on their role in the district.
`,
    prompt: `
# BMSD Character Prompts

Each character in the BMSD Case Study has a carefully crafted prompt that guides their responses. Here's a simplified version of how these prompts are structured:

## Dr. Emily Carter, Superintendent

\`\`\`
You are Dr. Emily Carter, Superintendent of Burlington-Montague School District (BMSD).

Background:
- You've been superintendent for 4 years
- You're dealing with a transportation crisis affecting student attendance
- Your priority is educational equity while being fiscally responsible
- You need to balance the needs of students, parents, staff, and the school board

When responding:
1. Emphasize the importance of keeping schools accessible to all students
2. Show concern about budget constraints
3. Consider long-term sustainability of any solution
4. Remain open to creative approaches while being practical
\`\`\`

## Ms. Linda Johnson, Bus Driver

\`\`\`
You are Ms. Linda Johnson, a bus driver with over 15 years of experience at BMSD.

Background:
- You've seen many changes to routes and policies over your career
- You're concerned about driver shortages and working conditions
- You care deeply about the students and their safety
- You have practical knowledge about road conditions and route efficiency

When responding:
1. Share insights from your on-the-ground experience
2. Express concern for both student needs and driver challenges
3. Offer practical perspective on proposed solutions
4. Include occasional anecdotes about your experiences with students
\`\`\`

Similar detailed prompts exist for the other characters, ensuring consistent, role-appropriate responses.
`,
    implementation: `
# Implementation Details

## Character Selection

The case study uses a character selector component that allows users to switch between different stakeholders:

\`\`\`jsx
<CharacterSelector 
  characters={CHARACTERS}
  onSelect={handleCharacterChange}
  currentCharacter={selectedCharacter}
/>
\`\`\`

## Conversation Management

Each character maintains their own separate conversation history:

\`\`\`jsx
const [conversations, setConversations] = useState({
  emily_carter: [],
  linda_johnson: [],
  david_rodriguez: [],
  sarah_lee: [],
  james_thompson: []
});
\`\`\`

## Character Definitions

Character personalities, roles and prompts are defined in a central configuration:

\`\`\`typescript
export const CHARACTERS = {
  emily_carter: {
    name: "Dr. Emily Carter",
    title: "Superintendent",
    greeting: "Hello, I'm Dr. Emily Carter, Superintendent of BMSD...",
    prompt: EMILY_CARTER_PROMPT
  },
  // Other characters defined similarly...
};
\`\`\`

## Educational Benefits

This multi-character simulation helps users:

1. Understand complex problems from multiple perspectives
2. Identify stakeholder concerns and priorities
3. Practice strategic thinking and solution development
4. Experience the challenges of balancing competing interests

The BMSD Transportation Case Study demonstrates how AI character interactions can create immersive, educational experiences for exploring real-world challenges.
`
  },
  "case-study": {
    default: `
# Case Study Assistant Demo

This demo showcases an interactive case study with multiple AI characters representing different stakeholders in a scenario.

## Overview

The Case Study Assistant allows users to explore complex scenarios through conversations with different AI characters, each representing a unique perspective or role.

## Features

- **Multiple Characters**: Interact with different AI personas
- **Role-Based Perspectives**: Get different viewpoints on the same situation
- **Guided Exploration**: Find solutions by understanding all sides of an issue
- **Educational Format**: Learn about complex topics through conversation

## Use Cases

- Business case studies
- Educational scenarios
- Training simulations
- Decision-making exercises

## How It Works

Users can switch between different characters to explore various perspectives on a situation. Each character has their own knowledge, biases, and viewpoints, creating a rich and nuanced learning experience.
`,
    prompt: `# Case Study Character Prompts

Each character in the case study has a unique prompt that defines their personality, knowledge, and perspective. Here's an example:

\`\`\`
You are Dr. Emily Carter, Superintendent of Bay Municipal School District (BMSD).

Background:
- You've been superintendent for 4 years
- You're dealing with a transportation crisis affecting student attendance
- Your priority is educational equity while being fiscally responsible
- You need to balance the needs of students, parents, staff, and the school board

When responding:
1. Emphasize the importance of keeping schools accessible to all students
2. Show concern about budget constraints
3. Consider long-term sustainability of any solution
4. Remain open to creative approaches while being practical
\`\`\`

Similar prompts are created for each character in the case study, ensuring consistent and realistic interactions.
`,
    implementation: `
# Implementation Details

## Character Selection

The case study uses a character selector component:

\`\`\`jsx
<CharacterSelector 
  characters={characters}
  onSelect={handleCharacterSelect}
  currentCharacter={selectedCharacter}
/>
\`\`\`

## Conversation Management

Each character maintains its own conversation history:

\`\`\`jsx
const { characters, selectedCharacter, addConversationItem } = useConversationStore();
\`\`\`

## Backend Processing

The backend uses specialized processing for each character:

\`\`\`javascript
// Process messages differently based on the selected character
async function processMessages(character) {
  const characterConfig = characterConfigs[character];
  const response = await api.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: characterConfig.prompt },
      ...messages
    ]
  });
  return response;
}
\`\`\`

## Future Improvements

Potential enhancements include:
- Adding character relationships and interactions
- Implementing scenario progression based on user conversations
- Adding visual elements like character portraits
- Supporting multimedia content in responses
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

export async function GET(request: Request) {
  // Get the demo ID and section from the URL parameters
  const { searchParams } = new URL(request.url);
  const demoId = searchParams.get('demo') || 'knowledge-assistant';
  const section = searchParams.get('section') || 'default';
  
  // Check if the requested demo exists
  if (!demoInfoSamples[demoId as keyof typeof demoInfoSamples]) {
    return NextResponse.json(
      { error: 'Demo not found' },
      { status: 404 }
    );
  }
  
  // Check if the requested section exists
  const demoInfo = demoInfoSamples[demoId as keyof typeof demoInfoSamples];
  if (!demoInfo[section as keyof typeof demoInfo]) {
    return NextResponse.json(
      { error: 'Section not found' },
      { status: 404 }
    );
  }
  
  // Return the requested content
  return NextResponse.json({
    id: demoId,
    section: section,
    content: demoInfo[section as keyof typeof demoInfo]
  });
} 