"use client";
import React, { useState } from "react";
import Chat from "./chat";
import CharacterSelector from "./character-selector";
import useConversationStore from "@/stores/useConversationStore";
import { Item, processMessages } from "@/lib/assistant";
import { CHARACTERS } from "@/config/constants";
import { Menu, X } from "lucide-react";

export default function Assistant() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    selectedCharacter,
    characters,
    addConversationItem,
    addChatMessage,
  } = useConversationStore();

  const chatMessages = characters[selectedCharacter].chatMessages;

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userItem: Item = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message.trim() }],
    };
    const userMessage: any = {
      role: "user",
      content: message.trim(),
    };

    try {
      addConversationItem(userMessage);
      addChatMessage(userItem);
      await processMessages();
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  return (
    <div className="h-full flex relative">
      {/* Mobile menu button */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden absolute top-3 left-4 z-20 p-2 hover:bg-gray-100 rounded-lg"
      >
        <Menu size={24} />
      </button>

      {/* Character Selector - Fixed width on desktop, slide-over on mobile */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-40
        transform lg:transform-none transition-transform duration-300 ease-in-out
        w-[280px] min-w-[280px] bg-white border-r border-gray-200
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex justify-between items-center p-4 lg:hidden border-b border-gray-200">
          <h2 className="font-semibold">Select Character</h2>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>
        <div className="h-full overflow-y-auto">
          <CharacterSelector />
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Chat Section - Flexible width */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-0 pl-12">
        {/* Character Info Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold">{CHARACTERS[selectedCharacter].name}</h2>
          <p className="text-sm text-gray-600">{CHARACTERS[selectedCharacter].title}</p>
        </div>
        
        {/* Chat Component */}
        <div className="flex-1 min-h-0">
          <Chat items={chatMessages} onSendMessage={handleSendMessage} />
        </div>
      </div>
    </div>
  );
}
