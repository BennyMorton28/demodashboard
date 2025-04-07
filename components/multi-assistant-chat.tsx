"use client";

import React, { useState, useRef, useEffect } from "react";
import Chat from "./chat";
import { Item, MessageItem } from "@/lib/assistant";

interface MultiAssistantChatProps {
  demoId: string;
  assistantId: string;
  assistantName: string;
}

export default function MultiAssistantChat({ 
  demoId, 
  assistantId,
  assistantName 
}: MultiAssistantChatProps) {
  // State for chat functionality
  const [messages, setMessages] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatsHistory] = useState<Record<string, Item[]>>({});
  
  // Refs for handling streaming responses
  const responseTextRef = useRef("");
  const responseIdRef = useRef(`msg_${Date.now()}`);
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageBufferRef = useRef("");

  // Load existing chat history when assistant changes
  useEffect(() => {
    if (chatHistory[assistantId]) {
      setMessages(chatHistory[assistantId]);
    } else {
      setMessages([]);
    }
    
    // Cleanup function for timers
    return () => {
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    };
  }, [assistantId, chatHistory]);

  // Function to update message content with rate limiting
  const updateMessageContent = (text: string, messageId: string) => {
    messageBufferRef.current = text;
    
    // If we already have a pending update, let it handle the new content
    if (bufferTimerRef.current) return;
    
    // Set up the update with a small delay
    bufferTimerRef.current = setTimeout(() => {
      setMessages(prev => {
        const newMessages = JSON.parse(JSON.stringify(prev));
        const index = newMessages.findIndex(
          (m: MessageItem) => m.type === "message" && m.role === "assistant" && m.id === messageId
        );

        if (index !== -1) {
          const assistantMessage = newMessages[index] as MessageItem;
          if (assistantMessage.type === "message") {
            assistantMessage.content = [{
              type: "output_text",
              text: messageBufferRef.current
            }];
          }
        }
        return newMessages;
      });
      
      // Reset the timer
      bufferTimerRef.current = null;
      
      // If more content came in while we were updating, schedule another update
      if (messageBufferRef.current !== text) {
        updateMessageContent(messageBufferRef.current, messageId);
      }
      
      // Force a scroll check after content update
      try {
        setTimeout(() => {
          const messagesContainer = document.querySelector(".overflow-y-auto");
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
      } catch (error) {
        // Ignore scroll errors
      }
    }, 50); // Small delay to batch rapid updates
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Create a unique ID for this message
    const messageId = `msg_${Date.now()}`;

    const userItem: MessageItem = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message.trim() }],
    };

    try {
      setIsLoading(true);
      // Add user message to the list
      setMessages(prev => [...prev, userItem]);

      // Save to assistant-specific history
      const updatedMessages = [...(chatHistory[assistantId] || []), userItem];
      setChatsHistory(prev => ({
        ...prev,
        [assistantId]: updatedMessages
      }));

      // Reset the buffer references
      messageBufferRef.current = "";
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = null;
      }

      // Create empty assistant message
      const assistantItem: MessageItem = {
        type: "message",
        role: "assistant",
        id: messageId,
        content: [{ 
          type: "output_text", 
          text: "" 
        }],
      };

      // Add the empty assistant message
      setMessages(prev => [...prev, assistantItem]);
      
      // Update chat history for this assistant
      setChatsHistory(prev => ({
        ...prev,
        [assistantId]: [...(prev[assistantId] || []), assistantItem]
      }));

      // Reset the response text for this new conversation turn
      responseTextRef.current = "";
      responseIdRef.current = messageId;

      // Call our API endpoint
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message.trim(),
          demoId: demoId,
          assistantId: assistantId // Include the assistant ID to load correct prompt
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get response: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // Helper function to extract delta text from different data structures
      const extractDeltaText = (parsed: any) => {
        if (parsed.choices && parsed.choices[0]?.delta?.content) {
          return parsed.choices[0].delta.content;
        }
        if (parsed.choices && parsed.choices[0]?.text) {
          return parsed.choices[0].text;
        }
        if (parsed.content) {
          return parsed.content;
        }
        return "";
      };

      // Helper function to attempt to fix malformed JSON
      const tryParseJSON = (text: string) => {
        try {
          return JSON.parse(text);
        } catch (e) {
          // Try to fix common JSON issues
          // 1. If it starts with data: 
          if (text.startsWith("data: ")) {
            return tryParseJSON(text.substring(6));
          }
          // If all else fails, return null
          return null;
        }
      };

      // Process the stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Decode the chunk and add it to our text
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(line => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const deltaText = extractDeltaText(parsed);
              if (deltaText) {
                fullText += deltaText;
                responseTextRef.current = fullText;
                updateMessageContent(fullText, responseIdRef.current);
              }
            } catch (e) {
              // Try to be more resilient with malformed JSON
              const parsed = tryParseJSON(data);
              if (parsed) {
                const deltaText = extractDeltaText(parsed);
                if (deltaText) {
                  fullText += deltaText;
                  responseTextRef.current = fullText;
                  updateMessageContent(fullText, responseIdRef.current);
                }
              }
            }
          }
        }
      }
      
      // Ensure the final state is set correctly
      if (responseTextRef.current) {
        // Force a final update
        if (bufferTimerRef.current) {
          clearTimeout(bufferTimerRef.current);
          bufferTimerRef.current = null;
        }
        updateMessageContent(responseTextRef.current, responseIdRef.current);
        
        // Update assistant history with final response
        const finalAssistantMessage: MessageItem = {
          type: "message",
          role: "assistant",
          id: messageId,
          content: [{ 
            type: "output_text", 
            text: responseTextRef.current 
          }],
        };
        
        // Update chat history
        setChatsHistory(prev => {
          const updatedHistory = [...prev[assistantId]];
          const msgIndex = updatedHistory.findIndex(
            (msg: any) => msg.type === "message" && msg.role === "assistant" && msg.id === messageId
          );
          
          if (msgIndex !== -1) {
            updatedHistory[msgIndex] = finalAssistantMessage;
          }
          
          return {
            ...prev,
            [assistantId]: updatedHistory
          };
        });
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      // Add error message
      const errorItem: MessageItem = {
        type: "message",
        role: "assistant",
        content: [{ 
          type: "output_text", 
          text: "Sorry, I encountered an error processing your request." 
        }],
      };

      setMessages(prev => [...prev, errorItem]);
      
      // Update chat history
      setChatsHistory(prev => ({
        ...prev,
        [assistantId]: [...(prev[assistantId] || []), errorItem]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-visible">
      {/* Assistant Info Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">{assistantName}</h2>
            <p className="text-sm text-gray-600">Your AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Chat Component */}
      <div 
        className="flex-1 overflow-visible" 
        style={{ 
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          paddingBottom: "20px",
          overflow: "visible"
        }}
      >
        <Chat 
          messages={messages} 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          starters={[
            "What can you help me with?",
            "Tell me about yourself",
            "What information do you have about this topic?",
            "How does this demo work?"
          ]}
        />
      </div>
    </div>
  );
} 