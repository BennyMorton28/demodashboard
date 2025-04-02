import React from 'react';
import { CHARACTERS } from '@/config/constants';
import useConversationStore from '@/stores/useConversationStore';

export default function CharacterSelector() {
  const { selectedCharacter, setSelectedCharacter, clearConversation } = useConversationStore();

  const handleCharacterChange = (characterId: string) => {
    setSelectedCharacter(characterId);
  };

  return (
    <div className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Select Character</h2>
      <div className="grid grid-cols-1 gap-2">
        {Object.entries(CHARACTERS).map(([id, character]) => (
          <button
            key={id}
            onClick={() => handleCharacterChange(id)}
            className={`flex flex-col items-start p-3 rounded-lg transition-colors ${
              selectedCharacter === id
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-white border-2 border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="font-medium">{character.name}</div>
            <div className="text-sm text-gray-600">{character.title}</div>
          </button>
        ))}
      </div>
      <button
        onClick={clearConversation}
        className="mt-4 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
      >
        Clear Conversation
      </button>
    </div>
  );
} 