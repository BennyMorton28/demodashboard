"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ToolCall from "./tool-call";
import Message from "./message";
import Annotations from "./annotations";
import { Item } from "@/lib/assistant";

interface ChatProps {
  items: Item[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  starters?: string[];
}

const Chat: React.FC<ChatProps> = ({ items, onSendMessage, isLoading = false, starters }) => {
  const itemsEndRef = useRef<HTMLDivElement>(null);
  const [inputMessageText, setinputMessageText] = useState<string>("");
  // This state is used to provide better user experience for non-English IMEs such as Japanese
  const [isComposing, setIsComposing] = useState(false);

  const scrollToBottom = () => {
    itemsEndRef.current?.scrollIntoView({ behavior: "instant" });
  };

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !isComposing) {
      event.preventDefault();
      onSendMessage(inputMessageText);
      setinputMessageText("");
    }
  }, [onSendMessage, inputMessageText, isComposing]);

  useEffect(() => {
    scrollToBottom();
  }, [items]);

  // Use custom starters if provided, otherwise use default ones
  const conversationStarters = starters || [
    "Can you explain the main points of the displayed content?",
    "What are the key features of this system?",
    "How can I get more information about this topic?",
    "Could you summarize this information for me?"
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4 mx-auto max-w-4xl">
          {items.length === 0 && (
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
          
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {item.type === "tool_call" ? (
                <ToolCall toolCall={item} />
              ) : item.type === "message" ? (
                <div className="flex flex-col gap-1 w-full">
                  <Message message={item} />
                  {item.content &&
                    item.content[0].annotations &&
                    item.content[0].annotations.length > 0 && (
                      <Annotations
                        annotations={item.content[0].annotations}
                      />
                    )}
                </div>
              ) : null}
            </React.Fragment>
          ))}
          
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-500">AI</span>
              </div>
              <div className="p-3 rounded-lg bg-gray-100 text-gray-700 relative max-w-[calc(100%-88px)]">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={itemsEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="p-3 border-t border-gray-200">
        <div className="mx-auto max-w-4xl">
          <div className="flex w-full items-end rounded-lg border border-gray-200 bg-white">
            <textarea
              id="prompt-textarea"
              tabIndex={0}
              dir="auto"
              rows={1}
              placeholder="Message..."
              className="flex-1 resize-none border-0 bg-transparent p-3 focus:outline-none text-sm min-h-[44px] max-h-[200px]"
              value={inputMessageText}
              onChange={(e) => setinputMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              disabled={isLoading}
            />
            <button
              disabled={!inputMessageText || isLoading}
              data-testid="send-button"
              className="flex h-[44px] w-[44px] items-center justify-center rounded-r-lg bg-black text-white transition-colors hover:opacity-70 disabled:bg-gray-100 disabled:text-gray-400"
              onClick={() => {
                onSendMessage(inputMessageText);
                setinputMessageText("");
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
