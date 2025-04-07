"use client";

import React, { useState, useRef } from "react";
import Chat from "./chat";
import { Item } from "@/lib/assistant";

export default function TayZondayAssistant() {
  const [messages, setMessages] = useState([
    {
      type: "message",
      role: "assistant",
      id: `initial_greeting_${Date.now()}`,
      content: [{ 
        type: "output_text", 
        text: "Hello! I'm Tay Zonday. How can I help you today?" 
      }],
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const responseTextRef = useRef("");
  const responseIdRef = useRef(`msg_${Date.now()}`);

  // Function to update message content
  const updateMessageContent = (text, messageId) => {
    setMessages(prev => {
      const newMessages = JSON.parse(JSON.stringify(prev));
      const index = newMessages.findIndex(
        (m) => m.type === "message" && m.role === "assistant" && m.id === messageId
      );

      if (index !== -1) {
        const assistantMessage = newMessages[index];
        if (assistantMessage.type === "message") {
          assistantMessage.content = [{
            type: "output_text",
            text: text
          }];
        }
      }

      return newMessages;
    });
    
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
  };

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    // Create a unique ID for this message
    const messageId = `msg_${Date.now()}`;

    const userItem = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message.trim() }],
    };

    try {
      setIsLoading(true);
      // Add user message to the list
      setMessages(prev => [...prev, userItem]);

      // Create empty assistant message
      const assistantItem = {
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
          demoId: "tay-zonday"
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
              if (parsed.choices && parsed.choices[0]?.delta?.content) {
                responseTextRef.current += parsed.choices[0].delta.content;
                updateMessageContent(responseTextRef.current, responseIdRef.current);
              }
            } catch (e) {
              console.error("Error parsing JSON from stream:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      // Add error message
      const errorItem = {
        type: "message",
        role: "assistant",
        content: [{ 
          type: "output_text", 
          text: "Sorry, I encountered an error processing your request." 
        }],
      };

      setMessages(prev => [...prev, errorItem]);
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
            <h2 className="text-lg font-semibold">Tay Zonday</h2>
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
            "Tell me about yourself",
            "What can you help me with?",
            "How does this demo work?",
            "What features do you have?"
          ]}
        />
      </div>
    </div>
  );
}