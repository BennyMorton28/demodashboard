# Kai (Kellogg AI) Configuration Guide

This guide explains how to update the prompt for Kai, the Kellogg AI assistant.

## Updating the Kai Prompt

The system prompt for Kai is stored in a dedicated file to make it easy to update without modifying other code.

### Location of the Prompt

The prompt is stored in: `lib/kai-prompt.ts`

### How to Update the Prompt

1. Open the `lib/kai-prompt.ts` file
2. Locate the `KAI_PROMPT` variable
3. Replace the placeholder content between the backticks (`) with your long markdown content
4. Save the file

Example:

```typescript
export const KAI_PROMPT = `
# Your detailed Kai prompt goes here

This can be as long as needed and include any markdown formatting.
`;
```

### Customization Options

The file also includes a `getCustomizedKaiPrompt` function that can be used to modify the prompt based on user context (such as their role, program, etc.). This can be expanded in the future to provide more personalized assistance.

## Using the Prompt in the Application

The prompt is imported in the `app/api/kai-chat/route.ts` file and used to generate responses to user queries. In a production environment, this would be passed to an AI service along with the user's messages.

## Best Practices for Prompt Engineering

When updating the prompt, consider the following best practices:

1. **Be specific**: Clearly define Kai's role, knowledge boundaries, and tone
2. **Provide context**: Include information about Kellogg programs, culture, and values
3. **Include examples**: Where helpful, provide examples of good responses
4. **Structure the information**: Use clear sections to organize different aspects of the prompt
5. **Test thoroughly**: After updating, test Kai with various queries to ensure it responds as expected 