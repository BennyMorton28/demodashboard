import { create } from "zustand";
import { Item } from "@/lib/assistant";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { INITIAL_MESSAGE, CHARACTERS } from "@/config/constants";

interface CharacterState {
  chatMessages: Item[];
  conversationItems: any[];
  lastResponseId?: string;
}

interface ConversationState {
  selectedCharacter: string;
  characters: Record<string, CharacterState>;
  setSelectedCharacter: (character: string) => void;
  setChatMessages: (items: Item[]) => void;
  setConversationItems: (messages: any[]) => void;
  addChatMessage: (item: Item) => void;
  addConversationItem: (message: ChatCompletionMessageParam) => void;
  setLastResponseId: (responseId: string) => void;
  clearConversation: () => void;
  rawSet: (state: any) => void;
}

const initialCharacterState = (characterId: string) => ({
  chatMessages: [
    {
      type: "message",
      role: "assistant",
      content: [{ 
        type: "output_text", 
        text: CHARACTERS[characterId].greeting 
      }],
    },
  ],
  conversationItems: [],
});

// Initialize state for each character
const initialCharacters: Record<string, CharacterState> = Object.keys(CHARACTERS).reduce(
  (acc, characterId) => ({
    ...acc,
    [characterId]: initialCharacterState(characterId),
  }),
  {}
);

const useConversationStore = create<ConversationState>((set, get) => ({
  selectedCharacter: "linda_johnson", // Default to Linda
  characters: initialCharacters,
  
  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
  
  setChatMessages: (items) =>
    set((state) => ({
      characters: {
        ...state.characters,
        [state.selectedCharacter]: {
          ...state.characters[state.selectedCharacter],
          chatMessages: items,
        },
      },
    })),
    
  setConversationItems: (messages) =>
    set((state) => ({
      characters: {
        ...state.characters,
        [state.selectedCharacter]: {
          ...state.characters[state.selectedCharacter],
          conversationItems: messages,
        },
      },
    })),
    
  addChatMessage: (item) =>
    set((state) => ({
      characters: {
        ...state.characters,
        [state.selectedCharacter]: {
          ...state.characters[state.selectedCharacter],
          chatMessages: [...state.characters[state.selectedCharacter].chatMessages, item],
        },
      },
    })),
    
  addConversationItem: (message) =>
    set((state) => ({
      characters: {
        ...state.characters,
        [state.selectedCharacter]: {
          ...state.characters[state.selectedCharacter],
          conversationItems: [...state.characters[state.selectedCharacter].conversationItems, message],
        },
      },
    })),

  setLastResponseId: (responseId) =>
    set((state) => ({
      characters: {
        ...state.characters,
        [state.selectedCharacter]: {
          ...state.characters[state.selectedCharacter],
          lastResponseId: responseId,
        },
      },
    })),

  clearConversation: () =>
    set((state) => ({
      characters: {
        ...state.characters,
        [state.selectedCharacter]: { ...initialCharacterState(state.selectedCharacter) },
      },
    })),

  rawSet: set,
}));

export default useConversationStore;
