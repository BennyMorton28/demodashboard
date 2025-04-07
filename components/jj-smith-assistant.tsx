"use client";

import React, { useState, useRef, useEffect } from "react";
import Chat from "./chat";
import { Item } from "@/lib/assistant";

export default function JjSmithAssistant() {
  const [messages, setMessages] = useState([
    {
      type: "message",
      role: "assistant",
      id: `initial_greeting_${Date.now()}`,
      content: [{ 
        type: "output_text", 
        text: "Hello! I'm jj. How can I help you today?" 
      }],
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const responseTextRef = useRef("");
  const responseIdRef = useRef(`msg_${Date.now()}`);
  const bufferTimerRef = useRef(null);
  const messageBufferRef = useRef("");

  // Cleanup function for timers
  useEffect(() => {
    return () => {
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    };
  }, []);

  // Function to update message content with rate limiting
  const updateMessageContent = (text, messageId) => {
    // Don't update if text is empty
    if (!text || text.trim() === "") return;
    
    messageBufferRef.current = text;
    
    // If we already have a pending update, let it handle the new content
    if (bufferTimerRef.current) return;
    
    // Set up the update with a small delay
    bufferTimerRef.current = setTimeout(() => {
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

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    // Create a unique ID for this message
    const messageId = `msg_${Date.now()}`;
    console.log(`Sending message to API, ID: ${messageId}`);

    const userItem = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message.trim() }],
    };

    try {
      setIsLoading(true);
      // Add user message to the list
      setMessages(prev => [...prev, userItem]);

      // Reset the buffer references
      messageBufferRef.current = "";
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = null;
      }

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

      console.log(`Making API request to /api/chat for demo: jj-smith`);
      // Call our API endpoint
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message.trim(),
          demoId: "jj-smith"
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
      let chunkCounter = 0;
      console.log(`Starting to process stream for message: ${messageId}`);

      // Process the stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log(`Stream completed for message: ${messageId}`);
          break;
        }

        // Decode the chunk and add it to our text
        const chunk = decoder.decode(value, { stream: true });
        chunkCounter++;
        
        // Only log occasionally to avoid console spam
        if (chunkCounter % 10 === 0) {
          console.log(`Received chunk ${chunkCounter} for message: ${messageId}`);
        }
        
        const lines = chunk.split("\n").filter(line => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            
            if (data === "[DONE]") {
              console.log(`Received [DONE] signal for message: ${messageId}`);
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              
              // Handle OpenAI format directly
              if (parsed.choices && parsed.choices[0]?.delta) {
                const content = parsed.choices[0].delta.content || "";
                if (content) {
                  fullText += content;
                  responseTextRef.current = fullText;
                  updateMessageContent(fullText, responseIdRef.current);
                }
              }
              // Handle older format
              else if (parsed.content) {
                fullText += parsed.content;
                responseTextRef.current = fullText;
                updateMessageContent(fullText, responseIdRef.current);
              }
            } catch (e) {
              console.warn(`Error parsing JSON from stream:`, e);
              // Skip this chunk if it's not valid JSON
            }
          }
        }
      }
      
      // Ensure the final state is set correctly
      if (responseTextRef.current) {
        console.log(`Final response length for message ${messageId}: ${responseTextRef.current.length} chars`);
        // Force a final update
        if (bufferTimerRef.current) {
          clearTimeout(bufferTimerRef.current);
          bufferTimerRef.current = null;
        }
        
        // Make sure there's actual content to show
        if (responseTextRef.current.trim()) {
          updateMessageContent(responseTextRef.current, responseIdRef.current);
        } else {
          // If we somehow got an empty response, show an error
          updateMessageContent("I apologize, but I couldn't generate a response. Please try again.", responseIdRef.current);
        }
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      // Add error message
      const errorItem = {
        type: "message",
        role: "assistant",
        id: messageId,
        content: [{ 
          type: "output_text", 
          text: "Sorry, I encountered an error processing your request. Please try again." 
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
            <h2 className="text-lg font-semibold">jj</h2>
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