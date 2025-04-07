"use client";
import React, { useState, useRef, useEffect } from "react";
import Chat from "./chat";
import { Item } from "@/lib/assistant";
import PartialJSON from 'partial-json';

export default function KaiAssistant() {
  const [messages, setMessages] = useState<Item[]>([
    {
      type: "message",
      role: "assistant",
      id: `initial_greeting_${Date.now()}`,
      content: [{ 
        type: "output_text", 
        text: "Hello! I'm Kai, Kellogg's AI assistant. I'm here to help with any questions about Kellogg School of Management programs, career advice, course selection, or general guidance for Kellogg students. How can I assist you today?" 
      }],
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const responseTextRef = useRef('');
  const responseIdRef = useRef(`msg_${Date.now()}`);
  const [debugInfo, setDebugInfo] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<{status: string, details?: any} | null>(null);
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
      
      // Fallback to deep search for complex structures
      const findDelta = (obj: any): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        
        if (obj.delta) {
          return typeof obj.delta === 'string' ? obj.delta : 
                 obj.delta.value ? obj.delta.value : null;
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

  // Add a helper function to manually attempt to fix malformed JSON
  const attemptJSONFix = (jsonStr: string): any => {
    try {
      // Try direct parsing first
      return JSON.parse(jsonStr);
    } catch (error) {
      console.log("Manual JSON fixing attempt");
      
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
      fixedJson = fixedJson.replace(/"\s*{/g, '",{');
      fixedJson = fixedJson.replace(/}\s*"/g, '},"');
      
      try {
        return JSON.parse(fixedJson);
      } catch (fixError) {
        // If we still can't parse, try a more brute force approach - extract known fields
        // Use regex to extract data we care about
        const extractJson: any = {};
        
        const eventMatch = jsonStr.match(/"event"\s*:\s*"([^"]*)"/);
        if (eventMatch && eventMatch[1]) {
          extractJson.event = eventMatch[1];
        }
        
        const deltaMatch = jsonStr.match(/"delta"\s*:\s*"([^"]*)"/);
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

  const handleSendMessage = async (message: string, apiEndpoint = '/api/kai-chat') => {
    if (!message.trim()) return;
    
    console.log("Sending message to Kai:", message);
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
      console.log("Fetching from /api/kai-chat");
      setDebugInfo(prev => prev + '\nFetching from API...');
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message.trim() }),
      });
      
      if (!response.ok) {
        // Check for rate limit response
        if (response.status === 429) {
          const errorData = await response.json();
          const waitMsg = errorData.message || "Please wait a moment before trying again.";
          throw new Error(`Rate limit reached: ${waitMsg}`);
        }
        throw new Error(`Failed to get response from assistant: ${response.status} ${response.statusText}`);
      }
      
      console.log("Got response, starting to read stream");
      setDebugInfo(prev => prev + '\nGot response, reading stream...');
      
      // Read the stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get stream reader');
      
      const decoder = new TextDecoder();
      let chunkCount = 0;
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream reading complete");
          setDebugInfo(prev => prev + '\nStream reading complete');
          break;
        }
        
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        chunkCount++;
        console.log(`Received chunk ${chunkCount}:`, chunk.length > 100 ? chunk.slice(0, 100) + "..." : chunk);
        setDebugInfo(prev => prev + `\nChunk ${chunkCount}: ${chunk.length} bytes`);
        
        // Process chunk more carefully, in case it's split across multiple 'data:' lines
        try {
          // Split the chunk by data: but keep track of partial chunks
          let processedChunk = chunk;
          let partialLine = '';
          
          // Check if the chunk starts with a partial line (no 'data: ' prefix)
          if (!chunk.trimStart().startsWith('data: ')) {
            console.log("Found partial chunk at start, buffering");
            setDebugInfo(prev => prev + '\nBuffering partial chunk start');
            partialLine = chunk;
            continue; // Skip to next chunk
          }
          
          // Handle multiple data: events in a single chunk
          const dataEvents = processedChunk.split('data: ');
          // Filter out empty strings (from the split)
          const validEvents = dataEvents.filter(event => event.trim().length > 0);
          
          setDebugInfo(prev => prev + `\nFound ${validEvents.length} data events in chunk`);
          
          for (const eventData of validEvents) {
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
                console.log("Standard JSON parsing failed, trying alternative methods");
                setDebugInfo(prev => prev + '\nTrying alternative JSON parsing');
                
                try {
                  // Try to use PartialJSON if available
                  if (typeof PartialJSON !== 'undefined' && PartialJSON.parse) {
                    parsedData = PartialJSON.parse(cleanEventData);
                    console.log("Recovered using partial-json parser");
                  } else {
                    // If PartialJSON isn't available, try our manual fixer
                    parsedData = attemptJSONFix(cleanEventData);
                    console.log("Recovered using manual JSON fix");
                  }
                } catch (partialJsonError) {
                  // Last resort, try to extract text with regex directly
                  console.log("All JSON parsing methods failed, falling back to regex extraction");
                  
                  const deltaMatch = cleanEventData.match(/"delta"\s*:\s*"([^"]*)"/);
                  if (deltaMatch && deltaMatch[1]) {
                    // Create a minimal structure matching what we expect
                    parsedData = {
                      event: "response.output_text.delta",
                      data: {
                        delta: deltaMatch[1]
                      }
                    };
                    console.log("Created synthetic delta data from regex");
                  } else {
                    throw new Error("Could not extract delta content");
                  }
                }
              }
              
              // Log the event type if we successfully parsed it
              if (parsedData && parsedData.event) {
                console.log("Event type:", parsedData.event);
                setDebugInfo(prev => prev + `\nEvent: ${parsedData.event}`);
              }
              
              // Handle text events
              if (parsedData && parsedData.event === 'response.output_text.delta') {
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
                let extractedText: string | null = null;
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

  // Sample conversation starters specific to Kellogg
  const kaiStarters = [
    "Can you tell me about Kellogg's MBA programs?",
    "What are some career paths for Kellogg graduates?",
    "How should I prepare for recruiting season?",
    "What electives would you recommend for someone interested in marketing?"
  ];

  // Add this function to test the API key directly
  const testApiKey = async () => {
    setApiKeyStatus({status: 'testing'});
    try {
      const response = await fetch('/api/test-openai');
      const data = await response.json();
      
      if (data.success) {
        setApiKeyStatus({
          status: 'valid', 
          details: {
            message: data.message,
            models: data.models,
            keyInfo: data.keyInfo
          }
        });
      } else {
        setApiKeyStatus({
          status: 'invalid',
          details: {
            error: data.error,
            message: data.message
          }
        });
      }
    } catch (error) {
      setApiKeyStatus({
        status: 'error',
        details: {error: error instanceof Error ? error.message : 'Unknown error'}
      });
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Assistant Info Header - Fixed */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Kai (Kellogg AI)</h2>
            <p className="text-sm text-gray-600">Your Kellogg student assistant</p>
          </div>
        </div>
        
        {/* Debug Panel - Hidden by default */}
        {showDebug && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <div className="flex flex-wrap gap-2 mb-2">
              <button 
                onClick={testApiKey} 
                className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                Test API Key
              </button>
              
              <button 
                onClick={() => {
                  setApiKeyStatus({status: 'trying_alt', details: {message: "Trying the alternate API route..."}});
                  handleSendMessage("Hello, using alternate API", "/api/kai-chat-alt");
                }} 
                className="px-2 py-1 bg-blue-100 rounded hover:bg-blue-200"
              >
                Try Alt API (GPT-3.5)
              </button>
            </div>
            
            {apiKeyStatus && (
              <div className="mt-2">
                <p><strong>Status:</strong> {apiKeyStatus.status}</p>
                {apiKeyStatus.details && (
                  <pre className="mt-1 p-1 bg-gray-200 rounded max-h-20 overflow-auto">
                    {JSON.stringify(apiKeyStatus.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Chat Component - Takes remaining height */}
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
          items={messages} 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          starters={[
            "Can you tell me about Kellogg's MBA program?",
            "What career resources are available for students?",
            "How can I best prepare for my marketing class?",
            "Tell me about student clubs at Kellogg"
          ]}
        />
      </div>
    </div>
  );
} 