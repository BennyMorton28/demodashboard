"use client";

import React, { useState, useRef, useEffect } from "react";
import Chat from "./chat";
import { Item, MessageItem } from "@/lib/assistant";

type ContentType = "input_text" | "output_text" | "refusal" | "output_audio";

interface MessageContent {
  type: ContentType;
  text: string;
}

interface Message {
  type: "message";
  role: "assistant" | "user";
  id: string;
  content: MessageContent[];
}

export default function JjSmithAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const responseTextRef = useRef("");
  const responseIdRef = useRef(`msg_${Date.now()}`);
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageBufferRef = useRef("");

  useEffect(() => {
    return () => {
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    };
  }, []);

  const updateMessageContent = (text: string, messageId: string) => {
    messageBufferRef.current = text;
    
    if (bufferTimerRef.current) return;
    
    bufferTimerRef.current = setTimeout(() => {
      setMessages(prev => {
        const newMessages = JSON.parse(JSON.stringify(prev)) as Message[];
        const index = newMessages.findIndex(
          (m) => m.type === "message" && m.role === "assistant" && m.id === messageId
        );

        if (index !== -1) {
          newMessages[index].content = [{
            type: "output_text",
            text: messageBufferRef.current
          }];
        }
        return newMessages;
      });
      
      bufferTimerRef.current = null;
      
      if (messageBufferRef.current !== text) {
        updateMessageContent(messageBufferRef.current, messageId);
      }
      
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
    }, 50);
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    const messageId = `msg_${Date.now()}`;

    const userMessage: Message = {
      type: "message",
      role: "user",
      id: messageId,
      content: [{ type: "input_text", text: message.trim() }],
    };

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, userMessage]);

      messageBufferRef.current = "";
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = null;
      }

      const assistantMessage: Message = {
        type: "message",
        role: "assistant",
        id: messageId,
        content: [{ 
          type: "output_text", 
          text: "" 
        }],
      };

      setMessages(prev => [...prev, assistantMessage]);

      responseTextRef.current = "";
      responseIdRef.current = messageId;

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);
            const deltaText = extractDeltaText(parsed);
            if (deltaText) {
              responseTextRef.current += deltaText;
              updateMessageContent(responseTextRef.current, responseIdRef.current);
            }
          } catch (error) {
            console.error("Error parsing chunk:", error);
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
    }
  };

  const extractDeltaText = (parsed: any): string => {
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

  return (
    <Chat
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
    />
  );
}