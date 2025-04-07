import React from 'react';
import { CHARACTERS } from '@/config/constants';

interface ConversationStartersProps {
  characterId: string;
  onSelectStarter: (message: string) => void;
  hasMessages: boolean;
}

const starters: Record<string, string[]> = {
  emily_carter: [
    "What are the main challenges facing BMSD's transportation system?",
    "How is the district working to address the transportation crisis?",
    "What impact is this having on student learning and attendance?"
  ],
  sarah_lee: [
    "What operational changes are you considering to improve efficiency?",
    "How are you managing the current bus routes and schedules?",
    "What new solutions are you exploring for the transportation system?"
  ],
  james_thompson: [
    "What's the current state of the transportation budget?",
    "How are the financial challenges affecting other district programs?",
    "What funding solutions are being considered?"
  ],
  david_rodriguez: [
    "How are students being affected by the transportation issues?",
    "What support do families need during this crisis?",
    "How is the school community responding to these challenges?"
  ],
  linda_johnson: [
    "What changes have you seen in the transportation system over the years?",
    "How are the current issues affecting your daily routes?",
    "What would help improve the situation from a driver's perspective?"
  ]
};

export default function ConversationStarters({ characterId, onSelectStarter, hasMessages }: ConversationStartersProps) {
  if (hasMessages) return null;

  const character = CHARACTERS[characterId];
  const characterStarters = starters[characterId];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 mb-6">
      <div className="text-sm text-gray-600 mb-3">
        Suggested questions for {character.name}:
      </div>
      <div className="flex flex-col gap-2">
        {characterStarters.map((starter, index) => (
          <button
            key={index}
            onClick={() => onSelectStarter(starter)}
            className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm text-gray-700"
          >
            {starter}
          </button>
        ))}
      </div>
    </div>
  );
} 