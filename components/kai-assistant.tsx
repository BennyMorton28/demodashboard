"use client";
import React, { useState, useRef } from "react";
import Chat from "./chat";
import { Item } from "@/lib/assistant";

export default function KaiAssistant() {
  const [messages, setMessages] = useState<Item[]>([
    {
      type: "message",
      role: "assistant",
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
          // Split the chunk into lines, but handle the case where a message might be split
          // across multiple chunks by keeping track of incomplete lines
          const lines = chunk.split('\n\n');
          setDebugInfo(prev => prev + `\nFound ${lines.length} lines in chunk`);
          
          for (const line of lines) {
            if (!line.trim()) continue; // Skip empty lines
            
            if (line.startsWith('data: ')) {
              const eventData = line.slice(6);
              
              // Handle end of stream
              if (eventData === '[DONE]') {
                console.log("Received [DONE] event");
                setDebugInfo(prev => prev + '\nReceived [DONE] event');
                setIsLoading(false);
                break;
              }
              
              try {
                // Parse the event data
                const parsedData = JSON.parse(eventData);
                console.log("Event type:", parsedData.event);
                setDebugInfo(prev => prev + `\nEvent: ${parsedData.event}`);
                
                // Handle text events
                if (parsedData.event === 'response.output_text.delta') {
                  try {
                    // Try to extract delta text with our helper function
                    const textDelta = extractDeltaText(parsedData);
                    
                    if (textDelta) {
                      responseTextRef.current += textDelta;
                      console.log("Text delta received:", textDelta);
                      setDebugInfo(prev => prev + `\nDelta: "${textDelta}"`);
                      
                      // Update the message with the latest text
                      setMessages(prev => {
                        const newMessages = [...prev];
                        const assistantMessageIndex = newMessages.findIndex(
                          msg => msg.type === 'message' && msg.role === 'assistant' && msg.id === responseIdRef.current
                        );
                        
                        if (assistantMessageIndex !== -1) {
                          const assistantMessage = newMessages[assistantMessageIndex];
                          if (assistantMessage.type === 'message') {
                            assistantMessage.content = [{
                              type: 'output_text',
                              text: responseTextRef.current
                            }];
                          }
                        } else {
                          console.log("Could not find assistant message with ID:", responseIdRef.current);
                          // Safely access properties that might not exist
                          const messageInfo = newMessages.map(m => {
                            let info = m.type || 'unknown-type';
                            if (m.type === 'message' && 'role' in m) info += `:${m.role}`;
                            if ('id' in m) info += `:${m.id}`;
                            return info;
                          }).join(', ');
                          console.log("Available messages:", messageInfo);
                        }
                        
                        return newMessages;
                      });
                    } else {
                      console.warn("Text delta is empty or undefined");
                      setDebugInfo(prev => prev + '\nWarning: Empty text delta');
                    }
                  } catch (deltaError) {
                    console.error("Error processing delta:", deltaError);
                    setDebugInfo(prev => prev + '\nError processing delta: ' + String(deltaError));
                  }
                }
              } catch (e) {
                console.error('Error parsing event data:', e);
                console.error('Problematic data:', line);
                setDebugInfo(prev => prev + '\nError parsing data: ' + String(e));
                
                // Try to recover from parsing errors by checking if it's a large chunk that might be truncated
                if (line.length > 10000) {
                  console.log("Large line detected, possible truncation. Adding partial content...");
                  
                  // Just use whatever text we can safely extract
                  try {
                    // Look for any content between quotes after "delta"
                    const deltaMatch = line.match(/"delta"\s*:\s*"([^"]+)/);
                    if (deltaMatch && deltaMatch[1]) {
                      const partialText = deltaMatch[1];
                      responseTextRef.current += partialText + " [...truncated...]";
                      
                      // Update the message with the partial content
                      setMessages(prev => {
                        const newMessages = [...prev];
                        const assistantMessageIndex = newMessages.findIndex(
                          msg => msg.type === 'message' && msg.role === 'assistant' && msg.id === responseIdRef.current
                        );
                        
                        if (assistantMessageIndex !== -1) {
                          const assistantMessage = newMessages[assistantMessageIndex];
                          if (assistantMessage.type === 'message') {
                            assistantMessage.content = [{
                              type: 'output_text',
                              text: responseTextRef.current
                            }];
                          }
                        }
                        
                        return newMessages;
                      });
                    }
                  } catch (recoveryError) {
                    console.error("Failed to recover from parsing error:", recoveryError);
                  }
                }
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
    <div className="h-full flex relative">
      {/* Chat Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Assistant Info Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Kai (Kellogg AI)</h2>
              <p className="text-sm text-gray-600">Your Kellogg student assistant</p>
            </div>
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              {showDebug ? 'Hide Debug' : 'Debug'}
            </button>
          </div>
          
          {/* Debug Panel */}
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
        
        {/* Chat Component */}
        <div className="flex-1 min-h-0">
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
    </div>
  );
} 