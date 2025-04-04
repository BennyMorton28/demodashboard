/**
 * This file contains the system prompt for Kai (Kellogg AI).
 * The prompt is loaded from a markdown file to simplify updates.
 */

import fs from 'fs';
import path from 'path';

// Read the prompt from the markdown file
const KAI_PROMPT_PATH = path.join(process.cwd(), 'lib', 'prompts', 'kai-prompt.md');
export const KAI_PROMPT = fs.readFileSync(KAI_PROMPT_PATH, 'utf-8');

/**
 * This function can be used to modify the prompt based on user context if needed.
 */
export function getCustomizedKaiPrompt(userContext?: any): string {
  // For now, we just return the basic prompt
  // In the future, this could be customized based on user role, program, etc.
  return KAI_PROMPT;
} 