"use client";
import React, { useState } from "react";
import Chat from "./chat";
import { Item } from "@/lib/assistant";

export default function KaiAssistant() {
  const [messages, setMessages] = useState<Item[]>([
    {
      type: "message",
      role: "assistant",
      content: [{ 
        type: "input_text", 
        text: "Hello! I'm Kai, Kellogg's AI assistant. I'm here to help with any questions about Kellogg School of Management programs, career advice, course selection, or general guidance for Kellogg students. How can I assist you today?" 
      }],
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userItem: Item = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message.trim() }],
    };

    try {
      setIsLoading(true);
      // Add user message to the list
      setMessages(prev => [...prev, userItem]);
      
      // Call our API endpoint
      const response = await fetch('/api/kai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from assistant');
      }
      
      const data = await response.json();
      
      // Add assistant response to the list
      const assistantItem: Item = {
        type: "message",
        role: "assistant",
        content: [{ 
          type: "input_text", 
          text: data.response
        }],
      };
      
      setMessages(prev => [...prev, assistantItem]);
    } catch (error) {
      console.error("Error processing message:", error);
      
      // Add error message
      const errorItem: Item = {
        type: "message",
        role: "assistant",
        content: [{ 
          type: "input_text", 
          text: "I'm sorry, I encountered an error while processing your request. Please try again."
        }],
      };
      
      setMessages(prev => [...prev, errorItem]);
    } finally {
      setIsLoading(false);
    }
  };

  // Sample conversation starters specific to Kellogg
  const kaiStarters = [
    "Can you tell me about Kellogg's MBA programs?",
    "What are some career paths for Kellogg graduates?",
    "How should I prepare for recruiting season?",
    "What electives would you recommend for someone interested in marketing?"
  ];

  return (
    <div className="h-full flex relative">
      {/* Chat Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Assistant Info Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold">Kai (Kellogg AI)</h2>
          <p className="text-sm text-gray-600">Your personal Kellogg School of Management assistant</p>
        </div>
        
        {/* Chat Component */}
        <div className="flex-1 min-h-0">
          <Chat 
            items={messages} 
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            starters={kaiStarters}
          />
        </div>
      </div>
    </div>
  );
} 