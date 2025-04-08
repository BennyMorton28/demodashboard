"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ToolCall from "./tool-call";
import Message from "./message";
import Annotations from "./annotations";
import { Item } from "@/lib/assistant";

interface ChatProps {
  items?: Item[];
  messages?: Item[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  starters?: string[];
}

const Chat: React.FC<ChatProps> = ({ items, messages, onSendMessage, isLoading = false, starters }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [inputMessageText, setInputMessageText] = useState<string>("");
  // This state is used to provide better user experience for non-English IMEs such as Japanese
  const [isComposing, setIsComposing] = useState(false);
  
  // Use messages prop if items is not provided
  const chatItems = items || messages || [];

  // Check if we should show the loading dots (only when there's an empty assistant message)
  const shouldShowLoadingDots = useCallback(() => {
    console.log("shouldShowLoadingDots check:");
    console.log("- isLoading:", isLoading);
    console.log("- chatItems length:", chatItems.length);
    
    if (!isLoading) {
      console.log("→ Not showing dots: isLoading is false");
      return false;
    }
    
    if (chatItems.length === 0) {
      console.log("→ Showing dots: no items yet");
      return true;
    }
    
    // Get the last message
    const lastItem = chatItems[chatItems.length - 1];
    console.log("- Last item role:", lastItem.type === "message" ? lastItem.role : "N/A (not a message)");
    console.log("- Last item type:", lastItem.type);
    
    if (lastItem.type === "message" && 'content' in lastItem && lastItem.content) {
      const content = lastItem.content[0];
      if (content && content.text) {
        console.log(`- Last item text: "${content.text.substring(0, 50)}${content.text.length > 50 ? '...' : ''}"`);
        
        // If there is text content in the last message from the assistant, don't show the dots
        if (lastItem.role === "assistant" && content.text.trim() !== "") {
          console.log("→ Not showing dots: assistant message has text content");
          return false;
        }
      } else {
        console.log("- Last item text: none or empty");
      }
    }
    
    // Only return false if the last message is from the user
    if (lastItem.type === "message" && 'role' in lastItem && lastItem.role === "user") {
      console.log("→ Not showing dots: last message is from user");
      return false;
    }
    
    // In all other cases, if isLoading is true, we should show the dots
    console.log("→ Showing dots: isLoading is true and last message needs dots");
    return true;
  }, [isLoading, chatItems]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      try {
        // Use a small delay to ensure DOM has updated
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ 
            behavior: "smooth", 
            block: "end" 
          });
        }, 50);
      } catch (error) {
        console.error("Error scrolling to bottom:", error);
      }
    }
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !isComposing) {
      event.preventDefault();
      if (inputMessageText.trim()) {
        onSendMessage(inputMessageText);
        setInputMessageText("");
      }
    }
  }, [onSendMessage, inputMessageText, isComposing]);

  useEffect(() => {
    scrollToBottom();
  }, [chatItems, scrollToBottom]);

  // Ensure we scroll after each message update
  useEffect(() => {
    scrollToBottom();
  }, [chatItems, scrollToBottom]);
  
  // Additional scroll check when content updates
  useEffect(() => {
    const checkScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollHeight, scrollTop, clientHeight } = messagesContainerRef.current;
        const bottomThreshold = 200; // Pixels from bottom to trigger auto-scroll
        
        if (scrollHeight - scrollTop - clientHeight < bottomThreshold) {
          scrollToBottom();
        }
      }
    };
    
    // Check on resize and when content potentially changes
    window.addEventListener('resize', checkScroll);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkScroll);
    };
  }, [scrollToBottom]);

  // Use custom starters if provided, otherwise use default ones
  const conversationStarters = starters || [
    "Can you explain the main points of the displayed content?",
    "What are the key features of this system?",
    "How can I get more information about this topic?",
    "Could you summarize this information for me?"
  ];

  return (
    <div ref={chatContainerRef} className="flex flex-col h-full relative overflow-hidden">
      {/* Messages Area - Scrollable - Important to have a fixed height container */}
      <div 
        ref={messagesContainerRef} 
        className="flex-1 overflow-y-auto"
        style={{ 
          paddingBottom: "150px", // Increased padding to ensure enough space
          height: "100%",
          position: "relative"
        }} 
      >
        <div className="px-4 py-4 space-y-4 mx-auto max-w-4xl">
          {chatItems.length === 0 && (
            <div className="py-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Get started by asking a question:</h3>
              <div className="grid grid-cols-1 gap-2">
                {conversationStarters.map((starter, idx) => (
                  <button
                    key={idx}
                    className="text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                    onClick={() => onSendMessage(starter)}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {chatItems.map((item, index) => (
            <React.Fragment key={index}>
              {item.type === "tool_call" ? (
                <ToolCall toolCall={item} />
              ) : item.type === "message" ? (
                <div className="flex flex-col gap-1 w-full">
                  <Message message={item} />
                  {item.content &&
                    item.content[0]?.annotations &&
                    item.content[0]?.annotations?.length > 0 && (
                      <Annotations
                        annotations={item.content[0].annotations}
                      />
                    )}
                </div>
              ) : null}
            </React.Fragment>
          ))}
          
          {shouldShowLoadingDots() && (
            <div className="flex justify-start px-4 py-2 mb-2">
              <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" 
                     style={{ 
                       animationDelay: '0ms',
                       animationDuration: '0.7s'
                     }}>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" 
                     style={{ 
                       animationDelay: '120ms',
                       animationDuration: '0.7s'
                     }}>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" 
                     style={{ 
                       animationDelay: '240ms',
                       animationDuration: '0.7s'
                     }}>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} style={{ marginBottom: "30px" }} />
        </div>
      </div>

      {/* Message Input - Fixed at bottom with improved positioning */}
      <div className="sticky bottom-0 left-0 right-0 py-2 px-3 border-t border-gray-200 bg-white shadow-lg" style={{ zIndex: 50 }}>
        <div className="mx-auto max-w-4xl">
          <div className="flex w-full items-end rounded-lg border border-gray-200 bg-white">
            <textarea
              id="prompt-textarea"
              tabIndex={0}
              dir="auto"
              rows={1}
              placeholder="Message..."
              className="flex-1 resize-none border-0 bg-transparent p-3 focus:outline-none text-sm min-h-[44px] max-h-[200px] overflow-auto"
              value={inputMessageText}
              onChange={(e) => setInputMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              disabled={isLoading}
              onClick={(e) => e.stopPropagation()} // Prevent event bubbling
            />
            <button
              disabled={!inputMessageText.trim() || isLoading}
              data-testid="send-button"
              className="flex h-[44px] w-[44px] items-center justify-center rounded-r-lg bg-black text-white transition-colors hover:opacity-70 disabled:bg-gray-100 disabled:text-gray-400"
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                if (inputMessageText.trim()) {
                  onSendMessage(inputMessageText);
                  setInputMessageText("");
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M1.5 8L14.5 8M14.5 8L8 1.5M14.5 8L8 14.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
