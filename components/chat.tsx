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
    if (!isLoading) return false;
    if (chatItems.length === 0) return true;
    
    // Get the last message
    const lastItem = chatItems[chatItems.length - 1];
    
    // Only show dots if the last message is from assistant and has no content yet
    // or if content exists but is very minimal (just starting to appear)
    return (
      lastItem.type === "message" && 
      lastItem.role === "assistant" && 
      (!lastItem.content || 
       !lastItem.content[0] || 
       !lastItem.content[0].text || 
       lastItem.content[0].text.trim() === "" ||
       // Add a small threshold - keep showing dots until we have at least 
       // a few characters (this helps synchronize the transition)
       (lastItem.content[0].text.trim().length < 3))
    );
  }, [isLoading, chatItems]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ 
          behavior: "smooth", 
          block: "end" 
        });
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
          paddingBottom: "100px", // Increased padding to ensure enough space
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
            <div className="flex justify-start px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" 
                     style={{ 
                       animationDelay: '0ms',
                       animationDuration: '0.7s'
                     }}>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" 
                     style={{ 
                       animationDelay: '120ms',
                       animationDuration: '0.7s'
                     }}>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" 
                     style={{ 
                       animationDelay: '240ms',
                       animationDuration: '0.7s'
                     }}>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input - Fixed at bottom with improved positioning */}
      <div className="absolute bottom-0 left-0 right-0 py-2 px-3 border-t border-gray-200 bg-white shadow-lg z-10">
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
