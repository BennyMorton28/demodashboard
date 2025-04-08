"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronUp, ChevronDown, Bug } from 'lucide-react';

// Event bus for debug messages
export type DebugMessage = {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'error' | 'warning' | 'success';
  data?: any;
};

// Global event bus
const debugEventBus = {
  listeners: new Set<(message: DebugMessage) => void>(),
  
  subscribe(listener: (message: DebugMessage) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },
  
  publish(message: DebugMessage) {
    this.listeners.forEach(listener => {
      listener(message);
    });
  }
};

// Global debug logging function that can be imported anywhere
export function logDebug(message: string, data?: any, type: 'info' | 'error' | 'warning' | 'success' = 'info') {
  const debugMessage: DebugMessage = {
    id: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    message,
    type,
    data
  };
  
  console.log(`[${type.toUpperCase()}] ${message}`, data);
  debugEventBus.publish(debugMessage);
}

export default function DebugOverlay() {
  const [messages, setMessages] = useState<DebugMessage[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    
    // Subscribe to debug messages
    const unsubscribe = debugEventBus.subscribe((message) => {
      setMessages(prev => [...prev.slice(-99), message]);
    });
    
    return unsubscribe;
  }, []);
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };
  
  const formatData = (data: any) => {
    if (data === undefined) return null;
    
    try {
      if (typeof data === 'object') {
        return JSON.stringify(data, null, 2);
      }
      return String(data);
    } catch (e) {
      return `[Cannot stringify data: ${e}]`;
    }
  };
  
  const getMessageColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'success': return 'text-green-500';
      default: return 'text-white';
    }
  };
  
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  const clearLogs = () => {
    setMessages([]);
  };
  
  if (!isClient) return null;
  
  const OverlayContent = (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-gray-900 bg-opacity-90 text-white font-mono text-xs overflow-hidden shadow-lg transition-all duration-200"
      style={{ 
        height: isExpanded ? '50vh' : '32px',
        maxHeight: isVisible ? (isExpanded ? '50vh' : '32px') : '32px'
      }}
    >
      <div className="flex items-center justify-between p-1 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center">
          <Bug className="h-4 w-4 text-yellow-400 mr-2" />
          <span className="font-semibold">Debug Overlay</span>
          <span className="ml-2 text-gray-400">({messages.length} logs)</span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={clearLogs}
            className="p-1 hover:bg-gray-700 rounded text-xs"
          >
            Clear
          </button>
          <button 
            onClick={toggleExpanded}
            className="p-1 hover:bg-gray-700 rounded"
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button 
            onClick={toggleVisibility}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="overflow-auto h-[calc(100%-32px)] p-2 space-y-1">
          {messages.length === 0 ? (
            <div className="text-gray-500 italic">No logs yet</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="border-b border-gray-800 pb-1 mb-1 last:border-0">
                <div className="flex items-start">
                  <span className="text-gray-500 mr-2">[{formatTime(msg.timestamp)}]</span>
                  <span className={`${getMessageColor(msg.type)} flex-1`}>{msg.message}</span>
                </div>
                {msg.data && (
                  <pre className="mt-1 pl-6 text-gray-400 overflow-x-auto whitespace-pre-wrap break-words max-h-32">
                    {formatData(msg.data)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
  
  return createPortal(OverlayContent, document.body);
} 