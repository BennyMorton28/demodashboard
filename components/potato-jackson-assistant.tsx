"use client";
import React, { useState, useRef, useEffect } from "react";
import Chat from "./chat";
import { Item } from "@/lib/assistant";
import PartialJSON from 'partial-json';

export default function PotatoJacksonAssistant() {
  const [messages, setMessages] = useState<Item[]>([
    {
      type: "message",
      role: "assistant",
      id: `initial_greeting_${Date.now()}`,
      content: [{ 
        type: "output_text", 
        text: "Hello! I'm Potato Jackson. How can I help you today?" 
      }],
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const responseTextRef = useRef('');
  const responseIdRef = useRef(`msg_${Date.now()}`);
  const [debugInfo, setDebugInfo] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  
  // Add a buffer and timer for smoothing out state updates
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const UPDATE_INTERVAL_MS = 50; // Update UI at most every 50ms

  // Add a buffer size threshold before showing any text
  const INITIAL_BUFFER_SIZE = 20; // Only start showing text once we have at least 20 chars
  const hasStartedStreamingRef = useRef(false);

  // Function to update message content with rate limiting
  const updateMessageContent = (text: string, messageId: string) => {
    const now = Date.now();
    
    // Don't display text until we have enough content to buffer
    if (!hasStartedStreamingRef.current && text.length < INITIAL_BUFFER_SIZE) {
      console.log(`Buffering initial text: ${text.length} chars (waiting for ${INITIAL_BUFFER_SIZE})`);
      return; // Don't update the UI yet
    }
    
    // Once we have enough text, mark as started so future updates happen immediately
    if (!hasStartedStreamingRef.current && text.length >= INITIAL_BUFFER_SIZE) {
      console.log(`Buffer threshold reached (${text.length} chars), starting to display text`);
      hasStartedStreamingRef.current = true;
    }
    
    // Rest of the update function with rate limiting
    // If we recently updated, schedule an update for later
    if (now - lastUpdateTimeRef.current < UPDATE_INTERVAL_MS) {
      // Clear existing timeout if there is one
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
      
      // Schedule a new update
      bufferTimeoutRef.current = setTimeout(() => {
        lastUpdateTimeRef.current = Date.now();
        bufferTimeoutRef.current = null;
        
        // Do the actual update
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
                text: text
              }];
            }
          }
          
          return newMessages;
        });
      }, UPDATE_INTERVAL_MS);
    } else {
      // It's been long enough since our last update, do it immediately
      lastUpdateTimeRef.current = now;
      
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
              text: text
            }];
          }
        }
        
        return newMessages;
      });
    }
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
    // Log the full structure for debugging
    console.log("EXTRACT DELTA: Full data structure:", JSON.stringify(parsedData, null, 2));
    
    let deltaText = '';
    
    try {
      // Based on observed logs, the delta text is directly in data.delta for delta events
      if (parsedData.data?.delta) {
        deltaText = parsedData.data.delta;
        console.log("EXTRACT DELTA: Found via data.delta");
        return deltaText;
      }
      
      // If we have the OpenAI event structure from the logs
      if (
        parsedData.event === 'response.output_text.delta' && 
        typeof parsedData.data === 'object'
      ) {
        if (parsedData.data.type === 'response.output_text.delta' && parsedData.data.delta) {
          deltaText = parsedData.data.delta;
          console.log("EXTRACT DELTA: Found via data.delta (OpenAI format)");
          return deltaText;
        }
      }
      
      // Standard chatGPT delta format
      if (parsedData.choices && Array.isArray(parsedData.choices) && parsedData.choices.length > 0) {
        const choice = parsedData.choices[0];
        if (choice.delta && choice.delta.content) {
          deltaText = choice.delta.content;
          console.log("EXTRACT DELTA: Found via choices[0].delta.content");
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
          console.log("EXTRACT DELTA: Found via deep search");
          return deltaText;
        }
      }
      
      // Final check for simplified event format from error recovery
      if (parsedData.event === 'error' && parsedData.data?.message) {
        deltaText = `[Error: ${parsedData.data.message}]`;
        console.log("EXTRACT DELTA: Found error message");
        return deltaText;
      }
      
      console.log("EXTRACT DELTA: Could not find delta text in the structure");
      return '';
    } catch (error) {
      console.error("EXTRACT DELTA: Error extracting delta text:", error);
      return '';
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    console.log("Sending message to Potato Jackson:", message);
    setDebugInfo('Sending message...');

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
      console.log("Added empty assistant message with ID:", messageId);
      setDebugInfo(prev => prev + '\nAdded empty assistant message');
      
      // Reset the response text for this new conversation turn
      responseTextRef.current = '';
      responseIdRef.current = messageId;
      
      // Call our API endpoint with streaming
      console.log("Fetching from /api/chat");
      setDebugInfo(prev => prev + '\nFetching from API...');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          demoId: "potato-jackson"
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get response from assistant: ${response.status} ${response.statusText}`);
      }
      
      console.log("Got response, starting to read stream");
      setDebugInfo(prev => prev + '\nGot response, reading stream...');
      
      // Read the stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get stream reader');
      
      const decoder = new TextDecoder();
      let chunkCount = 0;
      let unprocessedChunk = ''; // Store partial chunks between reads
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream reading complete");
          setDebugInfo(prev => prev + '\nStream reading complete');
          
          // Process any remaining unprocessed chunk at the end to avoid cutoffs
          if (unprocessedChunk.trim().length > 0) {
            console.log("Processing final unprocessed chunk:", unprocessedChunk);
            try {
              // Try to find any meaningful text in the final chunk
              const finalText = unprocessedChunk.replace(/^data:\s*/, '').trim();
              if (finalText && finalText !== '[DONE]') {
                // Try to extract meaningful content if possible
                try {
                  const parsedFinal = JSON.parse(finalText);
                  const finalDelta = extractDeltaText(parsedFinal);
                  if (finalDelta) {
                    responseTextRef.current += finalDelta;
                    updateMessageContent(responseTextRef.current, responseIdRef.current);
                  }
                } catch (e) {
                  // If we can't parse as JSON, just use the text directly if it's not empty
                  if (finalText.length > 3 && !finalText.includes('"event":"done"')) {
                    responseTextRef.current += ` ${finalText.replace(/["{}\[\]]/g, '')}`;
                    updateMessageContent(responseTextRef.current, responseIdRef.current);
                  }
                }
              }
            } catch (finalChunkError) {
              console.error("Error processing final chunk:", finalChunkError);
            }
          }
          
          break;
        }
        
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        chunkCount++;
        console.log(`Received chunk ${chunkCount}:`, chunk.length > 100 ? chunk.slice(0, 100) + "..." : chunk);
        setDebugInfo(prev => prev + `\nChunk ${chunkCount}: ${chunk.length} bytes`);
        
        // Add this chunk to any unprocessed data from previous reads
        const fullChunk = unprocessedChunk + chunk;
        unprocessedChunk = '';
        
        // Process chunk more carefully, in case it's split across multiple 'data:' lines
        try {
          // Split the chunk by data: but keep track of partial chunks
          let processedChunk = fullChunk;
          
          // Check if the chunk starts with a partial line (no 'data: ' prefix)
          if (!fullChunk.trimStart().startsWith('data: ')) {
            // If it doesn't start with 'data:', it might be an incomplete chunk
            console.log("Found partial chunk at start, buffering");
            setDebugInfo(prev => prev + '\nBuffering partial chunk start');
            unprocessedChunk = fullChunk;
            continue; // Skip to next chunk
          }
          
          // Handle multiple data: events in a single chunk
          const dataEvents = processedChunk.split('data: ');
          // Filter out empty strings (from the split)
          const validEvents = dataEvents.filter(event => event.trim().length > 0);
          
          setDebugInfo(prev => prev + `\nFound ${validEvents.length} data events in chunk`);
          
          for (let i = 0; i < validEvents.length; i++) {
            const eventData = validEvents[i];
            // Check if this is the last event and doesn't end with a newline - it might be incomplete
            if (i === validEvents.length - 1 && !eventData.endsWith('\n\n')) {
              unprocessedChunk = 'data: ' + eventData;
              console.log("Found potential partial chunk at end, buffering:", unprocessedChunk.length);
              continue;
            }
            
            // Clean up the event data by removing any trailing newlines
            const cleanEventData = eventData.replace(/\n\n$/, '');
            
            // Handle end of stream
            if (cleanEventData === '[DONE]') {
              console.log("Received [DONE] event");
              setDebugInfo(prev => prev + '\nReceived [DONE] event');
              setIsLoading(false);
              continue;
            }
            
            let parsedData: any;
            
            try {
              // First try to parse with standard JSON.parse
              try {
                parsedData = JSON.parse(cleanEventData);
              } catch (standardJsonError) {
                // If standard parsing fails, try using partial-json which is more tolerant
                console.log("Standard JSON parsing failed, trying partial-json");
                setDebugInfo(prev => prev + '\nTrying partial-json parser');
                
                // Use partial-json to parse incomplete or malformed JSON
                parsedData = PartialJSON.parse(cleanEventData);
                
                // Log recovery success
                console.log("Recovered using partial-json parser");
                setDebugInfo(prev => prev + '\nRecovered using partial JSON parser');
              }
              
              // Log the event type if we successfully parsed it
              if (parsedData && parsedData.event) {
                console.log("Event type:", parsedData.event);
                setDebugInfo(prev => prev + `\nEvent: ${parsedData.event}`);
              }
              
              // Handle text events - support both OpenAI delta format and standard chat completion format
              if (parsedData && 
                  (parsedData.event === 'response.output_text.delta' || 
                   (parsedData.choices && parsedData.choices.length > 0))) {
                try {
                  // Try to extract delta text with our helper function
                  const textDelta = extractDeltaText(parsedData);
                  
                  if (textDelta) {
                    // Append the new text to our reference
                    responseTextRef.current += textDelta;
                    
                    // Only log small delta chunks to avoid console spam
                    if (textDelta.length < 50) {
                      console.log("Text delta received:", textDelta);
                      setDebugInfo(prev => prev + `\nDelta: "${textDelta.slice(0, 30)}${textDelta.length > 30 ? '...' : ''}"`);
                    } else {
                      console.log(`Text delta received: (${textDelta.length} chars)`);
                      setDebugInfo(prev => prev + `\nDelta: (${textDelta.length} chars)`);
                    }
                    
                    // Update the message with the latest text
                    updateMessageContent(responseTextRef.current, responseIdRef.current);
                  } else {
                    console.warn("Text delta is empty or undefined");
                    setDebugInfo(prev => prev + '\nWarning: Empty text delta');
                  }
                } catch (deltaError) {
                  console.error("Error processing delta:", deltaError);
                  setDebugInfo(prev => prev + '\nError processing delta: ' + String(deltaError));
                }
              }
            } catch (parseError) {
              console.error('Error parsing event data:', parseError);
              setDebugInfo(prev => prev + '\nError parsing data: ' + String(parseError));
              
              // More robust recovery for large or problematic chunks
              try {
                console.log("Attempting to extract content using regex");
                
                // Enhanced regex pattern that's more tolerant of JSON structure issues
                // It attempts to find either:
                // 1. Content between delta and the next quote-comma pattern
                // 2. Any text content between quotes following "delta":"
                const patterns = [
                  /"delta"\s*:\s*"([^"]*)"/,           // Standard delta format
                  /"delta"\s*:\s*"([^"]*)(?:",|"})/,   // Delta at the end of an object
                  /"text"\s*:\s*"([^"]*)"/,            // Text field
                  /"content"\s*:\s*"([^"]*)"/,         // Content field
                  /"delta"\s*:\s*"(.*?)(?=",|\"})/     // Greedy match for delta
                ];
                
                // Try each pattern until we find a match
                let extractedText = null;
                for (const pattern of patterns) {
                  const match = cleanEventData.match(pattern);
                  if (match && match[1]) {
                    extractedText = match[1];
                    console.log(`Found text using pattern: ${pattern}`);
                    break;
                  }
                }
                
                // If we found text, use it
                if (extractedText) {
                  console.log(`Extracted ${extractedText.length} characters from chunk`);
                  responseTextRef.current += extractedText;
                  updateMessageContent(responseTextRef.current, responseIdRef.current);
                } else if (cleanEventData.length > 10000) {
                  // Only log a debug message for extremely large chunks but don't add truncation message
                  console.log("Very large chunk detected, but continuing without truncation");
                  // Don't add truncation message as it disrupts the flow and is handled by message.tsx
                }
              } catch (recoveryError) {
                console.error("Failed all recovery attempts:", recoveryError);
              }
            }
          }
        } catch (chunkError) {
          console.error("Error processing chunk:", chunkError);
          setDebugInfo(prev => prev + '\nError processing chunk: ' + String(chunkError));
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      setDebugInfo(prev => prev + '\nError: ' + String(error));
      
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
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Assistant Info Header - Fixed */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Potato Jackson</h2>
            <p className="text-sm text-gray-600">Your kai helper but unique</p>
          </div>
          {showDebug && (
            <div className="text-xs text-gray-500 mt-1 overflow-auto max-h-20 p-1 border rounded">
              {debugInfo}
            </div>
          )}
        </div>
      </div>
      
      {/* Chat Component - Takes remaining height */}
      <div className="flex-1 overflow-hidden relative">
        <Chat 
          items={messages} 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          starters={[
            "Tell me about the operations management course",
            "What are the key formulas we need to know?",
            "Can you explain the safety stock calculation?",
            "How do I calculate cycle service level?"
          ]}
        />
      </div>
    </div>
  );
}