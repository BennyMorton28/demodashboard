"use client";
import React, { useState, useRef, useEffect } from "react";
import Chat from "./chat";
import { Item } from "@/lib/assistant";
import PartialJSON from 'partial-json';
import { v4 as uuidv4 } from 'uuid';

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
  const INITIAL_BUFFER_SIZE = 5; // Reduced from 20 to 5 characters for faster initial display
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
    
    // Rate limiting logic for UI updates
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
        updateMessageState(text, messageId);
      }, UPDATE_INTERVAL_MS);
    } else {
      // It's been long enough since our last update, do it immediately
      lastUpdateTimeRef.current = now;
      updateMessageState(text, messageId);
    }
  };
  
  // Helper function to actually update the message state
  const updateMessageState = (text: string, messageId: string) => {
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
    // Basic structure debug (less verbose)
    if (process.env.NODE_ENV === 'development') {
      console.log("Event type:", parsedData.event || "unknown");
    }
    
    let deltaText = '';
    
    try {
      // Check for simplified delta format from our API update
      if (parsedData.event === 'response.output_text.delta' && parsedData.data?.delta) {
        deltaText = parsedData.data.delta;
        return deltaText;
      }
      
      // Legacy format with nested type property
      if (
        parsedData.event === 'response.output_text.delta' && 
        parsedData.data?.type === 'response.output_text.delta' &&
        parsedData.data?.delta
      ) {
        deltaText = parsedData.data.delta;
        return deltaText;
      }
      
      // Handle OpenAI's chat completions format
      if (parsedData.choices && parsedData.choices[0]?.delta?.content) {
        deltaText = parsedData.choices[0].delta.content;
        return deltaText;
      }
      
      // Final fallback to deep search for complex structures
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
          return deltaText;
        }
      }
      
      // Check for error message
      if (parsedData.event === 'error' && parsedData.data?.message) {
        deltaText = `[Error: ${parsedData.data.message}]`;
        return deltaText;
      }
      
      return '';
    } catch (error) {
      console.error("Error extracting delta text:", error);
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
      
      // First add a temporary "thinking" indicator
      const tempResponseId = uuidv4();
      responseIdRef.current = tempResponseId;
      responseTextRef.current = '';
      hasStartedStreamingRef.current = false; // Reset streaming state
      
      setMessages(prev => [
        ...prev,
        { 
          id: tempResponseId, 
          role: 'assistant', 
          type: 'message',
          content: [{ type: 'output_text', text: '...' }] 
        }
      ]);
      
      // Reset debug info
      setDebugInfo('');
      
      try {
        // Create our API fetch params
        const messagesToSend = [
          ...messages.filter(m => m.type === 'message').map(m => ({
            role: m.role,
            content: m.content[0]?.text || ''
          })),
          { role: 'user', content: message.trim() }
        ];
        
        const requestBody = JSON.stringify({
          messages: messagesToSend
        });
        
        // Create the event source with retries and better timeout handling
        const eventSource = new EventSource(`/api/kai-chat?init=${encodeURIComponent(requestBody)}`);
        setDebugInfo(prev => prev + '\nConnected to event stream');
        console.log("Connected to event stream");
        
        // Set up a connection timeout to avoid hanging connections
        const connectionTimeout = setTimeout(() => {
          console.error("Connection timed out after 15 seconds");
          eventSource.close();
          setIsLoading(false);
          
          // Update the message to show the timeout error
          setMessages(prev => {
            const newMessages = JSON.parse(JSON.stringify(prev));
            const index = newMessages.findIndex(
              (m: any) => m.type === 'message' && m.role === 'assistant' && m.id === responseIdRef.current
            );
            
            if (index !== -1) {
              const assistantMessage = newMessages[index];
              if (assistantMessage.type === 'message') {
                assistantMessage.content = [{
                  type: 'output_text',
                  text: responseTextRef.current || 'Connection timed out. Please try again.'
                }];
              }
            }
            
            return newMessages;
          });
        }, 15000); // 15 second timeout
        
        // Handle connection opened
        eventSource.onopen = () => {
          console.log("SSE connection opened");
          setIsLoading(true);
        };
        
        // Handle events received
        eventSource.onmessage = (event) => {
          // Clear the timeout since we're getting data
          clearTimeout(connectionTimeout);
          
          const chunk = event.data;
          
          // Process chunk more carefully, in case it's split across multiple 'data:' lines
          try {
            // Handle end of stream
            if (chunk.trim() === '[DONE]') {
              console.log("Received [DONE] event");
              setDebugInfo(prev => prev + '\nReceived [DONE] event');
              eventSource.close();
              setIsLoading(false);
              return;
            }
            
            // Parse the data
            try {
              const parsedData = JSON.parse(chunk);
              
              // Handle text events
              if (parsedData.event === 'response.output_text.delta') {
                // Extract the delta text
                const textDelta = extractDeltaText(parsedData);
                
                if (textDelta) {
                  // Update response text
                  responseTextRef.current += textDelta;
                  
                  // Update UI with the new text
                  updateMessageContent(responseTextRef.current, responseIdRef.current);
                }
              }
            } catch (parseError) {
              console.error("Error parsing event data:", parseError);
              
              // Try to recover with regex as a last resort
              try {
                const deltaPattern = /"delta"\s*:\s*"([^"]*)"/;
                const match = chunk.match(deltaPattern);
                
                if (match && match[1]) {
                  const extractedText = match[1];
                  responseTextRef.current += extractedText;
                  updateMessageContent(responseTextRef.current, responseIdRef.current);
                }
              } catch (recoveryError) {
                console.error("Failed to recover from parse error:", recoveryError);
              }
            }
          } catch (chunkError) {
            console.error("Error processing chunk:", chunkError);
          }
        };
        
        // Handle errors
        eventSource.onerror = (error) => {
          console.error("EventSource error:", error);
          setDebugInfo(prev => prev + '\nEventSource error: ' + String(error));
          clearTimeout(connectionTimeout);
          eventSource.close();
          setIsLoading(false);
          
          // If we have partial response text, show that instead of a generic error
          if (responseTextRef.current.length > 0) {
            updateMessageContent(responseTextRef.current + "\n\n[Connection ended]", responseIdRef.current);
          } else {
            // Update message with error
            setMessages(prev => {
              const newMessages = JSON.parse(JSON.stringify(prev));
              const index = newMessages.findIndex(
                (m: any) => m.type === 'message' && m.role === 'assistant' && m.id === responseIdRef.current
              );
              
              if (index !== -1) {
                const assistantMessage = newMessages[index];
                if (assistantMessage.type === 'message') {
                  assistantMessage.content = [{
                    type: 'output_text',
                    text: 'Error connecting to the assistant. Please try again.'
                  }];
                }
              }
              
              return newMessages;
            });
          }
        };
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