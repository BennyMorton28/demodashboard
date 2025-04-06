"use client";
import React, { useState, useRef, useEffect } from "react";
import Chat from "./chat";
import { Item } from "@/lib/assistant";
import PartialJSON from 'partial-json';

export default function FrankSacksAssistant() {
  const [messages, setMessages] = useState<Item[]>([
    {
      type: "message",
      role: "assistant",
      id: `initial_greeting_${Date.now()}`,
      content: [{ 
        type: "output_text", 
        text: "Hello! I'm Frank Sacks. How can I help you today?" 
      }],
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const responseTextRef = useRef('');
  const responseIdRef = useRef(`msg_${Date.now()}`);
  
  // Add a buffer and timer for smoothing out state updates
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const UPDATE_INTERVAL_MS = 50; // Update UI at most every 50ms
  
  // Track pending update to avoid excessive state updates
  const pendingUpdateRef = useRef<string>('');
  const isUpdatingRef = useRef<boolean>(false);

  // Add a buffer size threshold before showing any text
  const INITIAL_BUFFER_SIZE = 20; // Only start showing text once we have at least 20 chars
  const hasStartedStreamingRef = useRef(false);

  // Function to update message content with rate limiting
  const updateMessageContent = (text: string, messageId: string) => {
    const now = Date.now();
    
    // Don't display text until we have enough content to buffer
    if (!hasStartedStreamingRef.current && text.length < INITIAL_BUFFER_SIZE) {
      return; // Don't update the UI yet
    }
    
    // Once we have enough text, mark as started so future updates happen immediately
    if (!hasStartedStreamingRef.current && text.length >= INITIAL_BUFFER_SIZE) {
      hasStartedStreamingRef.current = true;
    }
    
    // Store the latest text in our pending ref
    pendingUpdateRef.current = text;
    
    // If an update is already scheduled or in progress, don't schedule another one
    if (bufferTimeoutRef.current || isUpdatingRef.current) {
      return;
    }
    
    // If we recently updated, schedule an update for later
    if (now - lastUpdateTimeRef.current < UPDATE_INTERVAL_MS) {
      // Schedule a new update
      bufferTimeoutRef.current = setTimeout(() => {
        performUpdate(messageId);
      }, UPDATE_INTERVAL_MS);
    } else {
      // It's been long enough since our last update, do it immediately
      performUpdate(messageId);
    }
  };
  
  // Separate function to perform the actual update to avoid nesting setMessages calls
  const performUpdate = (messageId: string) => {
    // Clear any existing timeout
    if (bufferTimeoutRef.current) {
      clearTimeout(bufferTimeoutRef.current);
      bufferTimeoutRef.current = null;
    }
    
    // Mark that we're updating
    isUpdatingRef.current = true;
    lastUpdateTimeRef.current = Date.now();
    
    // Get the latest text from our ref
    const textToUpdate = pendingUpdateRef.current;
    
    // Perform the actual update
    setMessages(prev => {
      // Create a deep copy to avoid mutation
      const newMessages = JSON.parse(JSON.stringify(prev));
      const index = newMessages.findIndex(
        (m: any) => m.type === 'message' && m.role === 'assistant' && m.id === messageId
      );
      
      if (index !== -1) {
        const assistantMessage = newMessages[index];
        if (assistantMessage.type === 'message') {
          assistantMessage.content = [{
            type: 'output_text',
            text: textToUpdate
          }];
        }
      }
      
      return newMessages;
    });
    
    // After a small delay, mark update as complete
    setTimeout(() => {
      isUpdatingRef.current = false;
      
      // If content has changed during the update, schedule another update
      if (pendingUpdateRef.current !== textToUpdate) {
        updateMessageContent(pendingUpdateRef.current, messageId);
      }
    }, 10);
  };

  // Clean up any pending timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    };
  }, []);

  // Helper function to extract delta text from different possible structures
  const extractDeltaText = (parsedData: any): string => {
    let deltaText = '';
    
    try {
      // Based on observed logs, the delta text is directly in data.delta for delta events
      if (parsedData.data?.delta) {
        deltaText = parsedData.data.delta;
        return deltaText;
      }
      
      // If we have the OpenAI event structure from the logs
      if (
        parsedData.event === 'response.output_text.delta' && 
        typeof parsedData.data === 'object'
      ) {
        if (parsedData.data.type === 'response.output_text.delta' && parsedData.data.delta) {
          deltaText = parsedData.data.delta;
          return deltaText;
        }
      }
      
      // Standard chatGPT delta format
      if (parsedData.choices && Array.isArray(parsedData.choices) && parsedData.choices.length > 0) {
        const choice = parsedData.choices[0];
        if (choice.delta && choice.delta.content) {
          deltaText = choice.delta.content;
          return deltaText;
        }
      }
      
      // Fallback to deep search for complex structures
      const findDelta = (obj: any): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        
        if (obj.delta) {
          return typeof obj.delta === 'string' ? obj.delta : 
                 obj.delta.value ? obj.delta.value : 
                 obj.delta.content ? obj.delta.content : null;
        }
        
        if (obj.content && typeof obj.content === 'string') {
          return obj.content;
        }
        
        for (const key in obj) {
          if (typeof obj[key] === 'object') {
            const found = findDelta(obj[key]);
            if (found) return found;
          }
        }
        
        return null;
      };
      
      if (!deltaText) {
        const foundDelta = findDelta(parsedData);
        if (foundDelta) {
          deltaText = foundDelta;
          return deltaText;
        }
      }
      
      // Final check for simplified event format from error recovery
      if (parsedData.event === 'error' && parsedData.data?.message) {
        deltaText = `[Error: ${parsedData.data.message}]`;
        return deltaText;
      }
      
      return '';
    } catch (error) {
      return '';
    }
  };

  // Add a helper function to manually attempt to fix malformed JSON
  const attemptJSONFix = (jsonStr: string): any => {
    try {
      // Try direct parsing first
      return JSON.parse(jsonStr);
    } catch (error) {
      // Common JSON errors we can try to fix
      let fixedJson = jsonStr;
      
      // 1. Try to fix unclosed quotes
      const unbalancedQuotes = (jsonStr.match(/"/g) || []).length % 2 !== 0;
      if (unbalancedQuotes) {
        fixedJson = fixedJson + '"';
      }
      
      // 2. Try to fix unclosed brackets/braces
      const openBraces = (jsonStr.match(/{/g) || []).length;
      const closeBraces = (jsonStr.match(/}/g) || []).length;
      if (openBraces > closeBraces) {
        fixedJson = fixedJson + '}'.repeat(openBraces - closeBraces);
      }
      
      // 3. Try to fix missing commas
      fixedJson = fixedJson.replace(/"s*{/g, '",{');
      fixedJson = fixedJson.replace(/}s*"/g, '},"');
      
      try {
        return JSON.parse(fixedJson);
      } catch (fixError) {
        // If we still can't parse, try a more brute force approach - extract known fields
        // Use regex to extract data we care about
        const extractJson: any = {};
        
        const eventMatch = jsonStr.match(/"event"s*:s*"([^"]*)"/);
        if (eventMatch && eventMatch[1]) {
          extractJson.event = eventMatch[1];
        }
        
        const deltaMatch = jsonStr.match(/"delta"s*:\s*"([^"]*)"/);
        if (deltaMatch && deltaMatch[1]) {
          extractJson.data = { delta: deltaMatch[1] };
        }
        
        if (Object.keys(extractJson).length > 0) {
          return extractJson;
        }
        
        throw new Error("Failed to manually fix JSON");
      }
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Create a unique ID for this message
    const messageId = `msg_${Date.now()}`;

    const userItem: Item = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message.trim() }],
    };

    try {
      setIsLoading(true);
      // Reset streaming flag for new message
      hasStartedStreamingRef.current = false;
      
      // Add user message to the list
      setMessages(prev => [...prev, userItem]);
      
      // Create empty assistant message to start with
      const assistantItem: Item = {
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
      responseTextRef.current = '';
      responseIdRef.current = messageId;
      
      // Call our API endpoint with streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          demoId: "frank-sacks"
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get response from assistant: ${response.status} ${response.statusText}`);
      }
      
      // Read the stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get stream reader');
      
      const decoder = new TextDecoder();
      let unprocessedChunk = ''; // Store partial chunks between reads
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Add this chunk to any unprocessed data from previous reads
        const fullChunk = unprocessedChunk + chunk;
        unprocessedChunk = '';
        
        // Split the chunk by data: but keep track of partial chunks
        const dataEvents = fullChunk.split('data: ');
        // Filter out empty strings (from the split)
        const validEvents = dataEvents.filter(event => event.trim().length > 0);
        
        for (let i = 0; i < validEvents.length; i++) {
          const eventData = validEvents[i];
          // Check if this is the last event and doesn't end with a newline - it might be incomplete
          if (i === validEvents.length - 1 && !eventData.endsWith('\n\n')) {
            unprocessedChunk = 'data: ' + eventData;
            continue;
          }
          
          // Clean up the event data by removing any trailing newlines
          const cleanEventData = eventData.replace(/\n\n$/, '');
          
          // Handle end of stream
          if (cleanEventData === '[DONE]') {
            setIsLoading(false);
            continue;
          }
          
          try {
            // First try to parse with standard JSON.parse
            let parsedData;
            try {
              parsedData = JSON.parse(cleanEventData);
            } catch (standardJsonError) {
              try {
                // Try to use PartialJSON if available
                parsedData = PartialJSON.parse(cleanEventData);
              } catch (partialJsonError) {
                // Last resort: manual JSON fix
                parsedData = attemptJSONFix(cleanEventData);
              }
            }
            
            if (parsedData) {
              const textDelta = extractDeltaText(parsedData);
              if (textDelta) {
                // Append the new text to our reference
                responseTextRef.current += textDelta;
                // Update the message with the latest text
                updateMessageContent(responseTextRef.current, responseIdRef.current);
              }
            }
          } catch (parseError) {
            console.error('Error parsing event data:', parseError);
          }
        }
      }
    } catch (error) {
      // Add error message
      const errorItem: Item = {
        type: "message",
        role: "assistant",
        content: [{ 
          type: "output_text", 
          text: "I'm sorry, I encountered an error while processing your request. Please try again."
        }],
      };
      
      setMessages(prev => [...prev, errorItem]);
    } finally {
      // Ensure loading state is properly reset
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Assistant Info Header - Fixed */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Frank Sacks</h2>
            <p className="text-sm text-gray-600">Your AI Assistant</p>
          </div>
        </div>
      </div>
      
      {/* Chat Component - Takes remaining height with proper container */}
      <div 
        className="flex-1 overflow-hidden relative" 
        style={{ 
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative"
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