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
  const [showDebug, setShowDebug] = useState(true);
  
  // Add a buffer and timer for smoothing out state updates
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const UPDATE_INTERVAL_MS = 50; // Update UI at most every 50ms

  // Add a buffer size threshold before showing any text
  const INITIAL_BUFFER_SIZE = 1; // Reduced to just 1 character for immediate display
  const hasStartedStreamingRef = useRef(false);

  // Function to update message content with rate limiting
  const updateMessageContent = (text: string, messageId: string, isStreaming: boolean) => {
    const now = Date.now();
    
    // Don't buffer - display immediately even with just 1 character
    if (!hasStartedStreamingRef.current) {
      console.log(`Starting display with ${text.length} chars`);
      hasStartedStreamingRef.current = true;
      
      // Force an immediate update for the first character
      updateMessageState(text, messageId);
      return;
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
      } else {
        // If we can't find the message, try to find the last assistant message
        const lastAssistantIndex = newMessages.findLastIndex(
          (m: any) => m.type === 'message' && m.role === 'assistant'
        );
        
        if (lastAssistantIndex !== -1) {
          const assistantMessage = newMessages[lastAssistantIndex];
          if (assistantMessage.type === 'message') {
            assistantMessage.content = [{
              type: 'output_text',
              text: text
            }];
          }
        } else {
          // If we can't find any assistant message, force add one
          newMessages.push({
            id: messageId,
            role: 'assistant' as const,
            type: 'message' as const,
            content: [{ type: 'output_text' as const, text: text }]
          });
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

  // Function to add to debug log
  const addDebugInfo = (info: string) => {
    console.log(info);
    setDebugInfo(prev => prev + "\n" + info);
  };

  // Helper function to extract delta text from different possible structures
  const extractDeltaText = (parsedData: any): string => {
    let deltaText = '';
    
    try {
      // Log the structure of parsedData to help debugging
      addDebugInfo(`Parsing data: ${JSON.stringify(parsedData).substring(0, 100)}...`);
      
      // Check for simplified delta format 
      if (parsedData.event === 'response.output_text.delta' && parsedData.data?.delta) {
        deltaText = parsedData.data.delta;
        addDebugInfo(`Extracted delta (format 1): "${deltaText}"`);
        return deltaText;
      }
      
      // Legacy format with nested type property
      if (
        parsedData.event === 'response.output_text.delta' && 
        parsedData.data?.type === 'response.output_text.delta' &&
        parsedData.data?.delta
      ) {
        deltaText = parsedData.data.delta;
        addDebugInfo(`Extracted delta (format 2): "${deltaText}"`);
        return deltaText;
      }
      
      // Handle OpenAI's chat completions format
      if (parsedData.choices && parsedData.choices[0]?.delta?.content) {
        deltaText = parsedData.choices[0].delta.content;
        addDebugInfo(`Extracted delta (OpenAI format): "${deltaText}"`);
        return deltaText;
      }
      
      // Check for error message
      if (parsedData.event === 'error' && parsedData.data?.message) {
        deltaText = `[Error: ${parsedData.data.message}]`;
        addDebugInfo(`Got error message: ${parsedData.data.message}`);
        return deltaText;
      }
      
      // Direct content
      if (parsedData.content) {
        deltaText = parsedData.content;
        addDebugInfo(`Extracted direct content: "${deltaText}"`);
        return deltaText;
      }
      
      addDebugInfo(`No delta found in data structure`);
      return '';
    } catch (error) {
      addDebugInfo(`Error extracting delta: ${error}`);
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
    
    // Clear previous debug info for a new message
    setDebugInfo("");
    addDebugInfo(`Sending message: ${message}`);
    
    // Create a unique ID for this message
    const messageId = `msg_${Date.now()}`;
    addDebugInfo(`Created message ID: ${messageId}`);

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
      
      // First add a temporary assistant message
      const tempResponseId = uuidv4();
      responseIdRef.current = tempResponseId;
      responseTextRef.current = '';
      
      setMessages(prev => {
        const newMessages = [
          ...prev,
          { 
            id: tempResponseId, 
            role: 'assistant' as const, 
            type: 'message' as const,
            content: [{ type: 'output_text' as const, text: '' }] 
          }
        ];
        return newMessages;
      });
      
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
      
      // Clean up any existing EventSource before creating a new one
      let eventSource: EventSource | null = null;
      let connectionTimeout: NodeJS.Timeout | null = null;
      let connectionClosed = false;
      
      // Function to clean up resources
      const cleanup = () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        connectionClosed = true;
        setIsLoading(false);
      };
      
      // Create the event source with query parameters for GET request
      try {
        const url = new URL(apiEndpoint, window.location.origin);
        url.searchParams.append('init', encodeURIComponent(requestBody));
        
        eventSource = new EventSource(url.toString());
        
        // Set up a connection timeout to avoid hanging connections
        connectionTimeout = setTimeout(() => {
          console.error("Connection timed out after 15 seconds");
          
          // Update the message to show the timeout error
          const timeoutText = responseTextRef.current || 'Connection timed out. Please try again.';
          updateMessageContent(timeoutText, responseIdRef.current, false);
          cleanup();
        }, 15000); // 15 second timeout
        
        // Handle connection opened
        eventSource.onopen = (event) => {
          // Clear timeout and set a new longer one
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
          }
          
          connectionTimeout = setTimeout(() => {
            // Close connection after 2 minutes to prevent resource leaks
            cleanup();
          }, 120000); // 2 minute max streaming time
        };
        
        // Handle events received
        eventSource.onmessage = (event) => {
          if (connectionClosed) {
            return; // Skip processing if we've already closed
          }
          
          const chunk = event.data;
          console.log("Received raw chunk:", chunk);
          
          // Handle end of stream
          if (chunk.trim() === '[DONE]') {
            cleanup();
            return;
          }
          
          // For SSE format, data is already properly formatted and doesn't need data: prefix removal
          try {
            // Directly parse the chunk as JSON
            const parsedData = JSON.parse(chunk);
            processEventData(parsedData);
          } catch (parseError) {
            console.error("Error parsing event data:", parseError);
            
            // Fallback for handling any malformed JSON or non-JSON content
            if (chunk && typeof chunk === 'string' && chunk.length > 0) {
              // If it looks like it might be JSON but has an error, try to fix it
              if (chunk.includes('"event"') || chunk.includes('"data"')) {
                try {
                  // Try using our more flexible JSON parser
                  const parsedData = attemptJSONFix(chunk);
                  processEventData(parsedData);
                  return;
                } catch (fixError) {
                  console.error("Failed to fix JSON:", fixError);
                }
              }
              
              // Last resort: use the raw content
              console.log("Using raw chunk as content:", chunk);
              responseTextRef.current += chunk;
              updateMessageContent(responseTextRef.current, responseIdRef.current, false);
            }
          }
        };
        
        // Process parsed event data
        const processEventData = (parsedData: any) => {
          console.log("Processing event data:", parsedData);
          
          // Handle text events - check for the specific event type we expect
          if (parsedData.event === 'response.output_text.delta') {
            // Extract the delta text from our simplified format
            const textDelta = parsedData.data?.delta || '';
            
            if (textDelta) {
              // Update response text
              responseTextRef.current += textDelta;
              
              // Update UI with the new text
              updateMessageContent(responseTextRef.current, responseIdRef.current, false);
            }
          } else if (parsedData.event === 'error') {
            // Handle detailed error events from server
            const errorMsg = parsedData.data?.message || "Unknown error";
            const errorCode = parsedData.data?.code || 500;
            const errorType = parsedData.data?.type || "api_error";
            
            console.error(`Error from server: ${errorType} (${errorCode}): ${errorMsg}`);
            addDebugInfo(`Error details: ${errorType} (${errorCode}): ${errorMsg}`);
            
            // Format a user-friendly error message
            let userErrorMsg = `Error: ${errorMsg}`;
            
            // Add more context for specific error types
            if (errorType === "openai_error" || errorType === "api_error") {
              if (errorCode === 429) {
                userErrorMsg = "The AI service is currently experiencing high demand. Please try again in a moment.";
              } else if (errorCode >= 500) {
                userErrorMsg = "The AI service is currently unavailable. Please try again later.";
              }
            }
            
            if (responseTextRef.current.length > 0) {
              responseTextRef.current += `\n\n[${userErrorMsg}]`;
            } else {
              responseTextRef.current = userErrorMsg;
            }
            
            updateMessageContent(responseTextRef.current, responseIdRef.current, false);
            cleanup();
          } else if (parsedData.event === 'warning') {
            // Handle warning events
            const warningMsg = parsedData.data?.message || "Warning: Something went wrong.";
            console.warn("Warning from server:", warningMsg);
            addDebugInfo(`Warning: ${warningMsg}`);
            
            // For warnings, we might want to show them but not stop the response
            if (responseTextRef.current.length > 0) {
              responseTextRef.current += `\n\n[Note: ${warningMsg}]`;
            } else {
              responseTextRef.current = `Note: ${warningMsg}`;
            }
            
            updateMessageContent(responseTextRef.current, responseIdRef.current, false);
          } else if (parsedData.event === 'response.completed') {
            console.log("Stream completed successfully");
            cleanup();
          } else {
            // For any unknown event type, try to extract content with our helper
            console.log("Unhandled event type:", parsedData.event);
            const textDelta = extractDeltaText(parsedData);
            if (textDelta) {
              responseTextRef.current += textDelta;
              updateMessageContent(responseTextRef.current, responseIdRef.current, false);
            }
          }
        };
        
        // Handle errors
        eventSource.onerror = (error) => {
          console.error('EventSource error:', error);
          let errorMessage = "Connection to AI assistant failed. ";
          
          // Handle specific connection errors
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as any).status;
            if (status === 429) {
              errorMessage += "Service is experiencing high traffic. Please try again later.";
            } else if (status >= 500) {
              errorMessage += "Server is currently unavailable. Please try again shortly.";
            } else if (status === 401 || status === 403) {
              errorMessage += "Authentication error. Please refresh the page or contact support.";
            }
          } else {
            errorMessage += "Please check your internet connection and try again.";
          }
          
          addDebugInfo(`EventSource error: ${JSON.stringify(error)}`);
          updateMessageContent(errorMessage, responseIdRef.current, false);
          setIsLoading(false);
          if (eventSource) {
            eventSource.close();
          }
        };
      } catch (error) {
        console.error("Error processing message:", error);
        
        // Add error message
        updateMessageContent("I'm sorry, I encountered an error while processing your request. Please try again.", responseIdRef.current, false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          type: "message",
          role: "assistant",
          id: messageId,
          content: [{ 
            type: "output_text", 
            text: "I'm sorry, I encountered an error while processing your request. Please try again."
          }],
        }
      ]);
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
          <div>
            <button 
              onClick={() => setShowDebug(!showDebug)} 
              className="text-xs px-2 py-1 bg-gray-100 rounded"
            >
              {showDebug ? "Hide Debug" : "Show Debug"}
            </button>
          </div>
        </div>
        
        {/* Debug Panel - Shown/hidden with toggle */}
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
              
              <button 
                onClick={() => {
                  setApiKeyStatus({status: 'testing_stream', details: {message: "Testing streaming implementation..."}});
                  handleSendMessage("Testing streaming implementation", "/api/test-kai");
                }} 
                className="px-2 py-1 bg-green-100 rounded hover:bg-green-200"
              >
                Test Streaming
              </button>
              
              <button 
                onClick={() => {
                  // Add a direct content update without any API calls
                  addDebugInfo("Direct UI update test");
                  const testId = uuidv4();
                  setMessages(prev => [
                    ...prev,
                    {
                      type: "message",
                      role: "user",
                      content: [{ type: "input_text", text: "Direct test" }],
                    },
                    {
                      type: "message",
                      role: "assistant",
                      id: testId,
                      content: [{ type: "output_text", text: "This is a direct test message without any API calls." }],
                    }
                  ]);
                }} 
                className="px-2 py-1 bg-red-100 rounded hover:bg-red-200"
              >
                Direct UI Test
              </button>
              
              <div className="px-2 py-1 bg-yellow-100 rounded">
                isLoading: {isLoading ? "TRUE" : "FALSE"}
              </div>
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
            
            <div className="mt-2">
              <p><strong>Debug Log:</strong></p>
              <pre className="mt-1 p-1 bg-gray-200 rounded text-xs max-h-40 overflow-auto whitespace-pre-wrap">
                {debugInfo || "No debug info yet"}
              </pre>
            </div>
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
          position: "relative",
          height: "calc(100vh - 250px)" // Force explicit height
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