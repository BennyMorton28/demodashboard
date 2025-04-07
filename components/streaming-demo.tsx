"use client";

import React, { useState, useRef, useEffect } from 'react';

const StreamingDemo = () => {
  const [message, setMessage] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [fullResponse, setFullResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [eventLog, setEventLog] = useState<Array<{type: string, time: string}>>([]);
  const [error, setError] = useState('');
  const streamEndRef = useRef<HTMLDivElement>(null);

  // Example prompts users can try
  const examplePrompts = [
    "Tell me a short story about a robot learning to paint.",
    "Explain how streaming API responses work in 3 sentences.",
    "Write a haiku about programming.",
    "Say 'double bubble bath' ten times fast."
  ];

  // Auto-scroll to the bottom of the response
  useEffect(() => {
    if (streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingText]);

  const handlePromptSelect = (prompt: string) => {
    setMessage(prompt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    try {
      setIsStreaming(true);
      setStreamingText('');
      setFullResponse('');
      setEventLog([]);
      setError('');
      
      // Create EventSource for Server-Sent Events
      const response = await fetch('/api/streaming-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stream response');
      }
      
      // Read the stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get stream reader');
      
      const decoder = new TextDecoder();
      let responseText = '';
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = line.slice(6);
            
            // Handle end of stream
            if (eventData === '[DONE]') {
              setIsStreaming(false);
              break;
            }
            
            try {
              // Parse the event data
              const parsedData = JSON.parse(eventData);
              
              // Log the event type
              setEventLog(prev => [...prev, {
                type: parsedData.event,
                time: new Date().toLocaleTimeString()
              }]);
              
              // Handle content chunks
              if (parsedData.event === 'content.chunk') {
                const textDelta = parsedData.data.content;
                responseText += textDelta;
                setStreamingText(responseText);
              }
            } catch (e) {
              console.error('Error parsing event data:', e);
            }
          }
        }
      }
      
      // Save the final result
      setFullResponse(responseText);
      setIsStreaming(false);
      
    } catch (error) {
      console.error('Error streaming response:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white p-4">
        <h2 className="text-xl font-semibold">OpenAI Streaming API Demo</h2>
        <p className="text-sm text-gray-600">
          See responses stream in real-time as they're generated
        </p>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto flex flex-col md:flex-row">
        {/* Left side - Input and controls */}
        <div className="md:w-1/2 p-4 border-r border-gray-200">
          <form onSubmit={handleSubmit} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your message:
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-3 min-h-[100px] focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mb-4"
              placeholder="Type your message here..."
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={isStreaming || !message.trim()}
              className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isStreaming ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                'Start Stream'
              )}
            </button>
          </form>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Example prompts:</h3>
            <div className="space-y-2">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptSelect(prompt)}
                  disabled={isStreaming}
                  className="block w-full text-left p-2 border border-gray-200 rounded-md hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-150"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right side - Response and events */}
        <div className="md:w-1/2 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Response:</h3>
            <div className="border border-gray-200 rounded-md p-4 min-h-[200px] max-h-[300px] overflow-auto bg-gray-50 relative">
              {error ? (
                <p className="text-red-500">{error}</p>
              ) : streamingText ? (
                <div className="whitespace-pre-wrap">
                  {streamingText}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-black animate-pulse" />
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Response will appear here...</p>
              )}
              <div ref={streamEndRef} />
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Event Log:</h3>
            <div className="border border-gray-200 rounded-md p-4 h-[200px] overflow-auto bg-gray-50">
              {eventLog.length === 0 ? (
                <p className="text-gray-400">Events will be logged here...</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {eventLog.map((event, index) => (
                    <li key={index} className="font-mono">
                      {event.time} - <span className="font-semibold">{event.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingDemo; 