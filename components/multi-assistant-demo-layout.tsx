"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock, User } from "lucide-react";

interface Assistant {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isLocked: boolean;
}

interface MultiAssistantDemoLayoutProps {
  title: string;
  assistants: Assistant[];
  activeAssistant: string;
  onAssistantChange: (assistantId: string) => void;
  onUnlockAssistant: (assistantId: string, password: string) => Promise<boolean>;
  contentComponent: React.ReactNode;
  chatComponent: React.ReactNode;
}

const MultiAssistantDemoLayout: React.FC<MultiAssistantDemoLayoutProps> = ({ 
  title, 
  assistants, 
  activeAssistant,
  onAssistantChange,
  onUnlockAssistant,
  contentComponent,
  chatComponent
}) => {
  const [footerHeight, setFooterHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(64); // Default
  const [passwordInput, setPasswordInput] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [attemptingUnlock, setAttemptingUnlock] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  
  // Measure header and footer heights for accurate content area sizing
  useEffect(() => {
    const updateHeights = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
      if (footerRef.current) {
        setFooterHeight(footerRef.current.offsetHeight);
      }
    };
    
    // Initial measurement
    updateHeights();
    
    // Update on resize
    window.addEventListener('resize', updateHeights);
    
    // Delayed measurement for after full render
    setTimeout(updateHeights, 500);
    
    return () => window.removeEventListener('resize', updateHeights);
  }, []);

  // Calculate the available content height
  const contentHeight = `calc(100vh - ${headerHeight}px - ${footerHeight}px)`;

  // Handle attempting to unlock an assistant
  const handleUnlockAttempt = async (assistantId: string) => {
    setAttemptingUnlock(assistantId);
    setUnlockError("");
  };

  // Handle password submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!attemptingUnlock || !passwordInput.trim()) return;
    
    try {
      const success = await onUnlockAssistant(attemptingUnlock, passwordInput);
      
      if (success) {
        setPasswordInput("");
        setAttemptingUnlock(null);
        // Switch to the newly unlocked assistant
        onAssistantChange(attemptingUnlock);
      } else {
        setUnlockError("Incorrect password. Please try again.");
      }
    } catch (error) {
      setUnlockError("An error occurred. Please try again.");
    }
  };

  // Cancel unlocking
  const cancelUnlock = () => {
    setAttemptingUnlock(null);
    setPasswordInput("");
    setUnlockError("");
  };

  // Find the current active assistant
  const currentAssistant = assistants.find(a => a.id === activeAssistant) || assistants[0];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Fixed Header */}
      <header 
        ref={headerRef}
        className="border-b border-gray-200 fixed top-0 left-0 right-0 z-30 bg-white"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <div className="w-24"></div> {/* Spacer for balance */}
          </div>
        </div>
      </header>

      {/* Main content area - positioned below header and above footer */}
      <main 
        className="flex w-full flex-1 overflow-hidden"
        style={{ 
          marginTop: `${headerHeight}px`,
          marginBottom: `${footerHeight}px`,
          height: contentHeight
        }}
      >
        {/* Left sidebar - Assistants */}
        <div className="w-64 bg-gray-50 overflow-y-auto border-r border-gray-200">
          <div className="p-4">
            <h2 className="font-semibold text-gray-700 mb-4">Available Assistants</h2>
            
            <div className="space-y-2">
              {assistants.map(assistant => (
                <button
                  key={assistant.id}
                  onClick={() => assistant.isLocked 
                    ? handleUnlockAttempt(assistant.id) 
                    : onAssistantChange(assistant.id)
                  }
                  className={`
                    w-full text-left px-3 py-2 rounded-lg flex items-center
                    ${assistant.id === activeAssistant 
                      ? 'bg-blue-100 border border-blue-300' 
                      : assistant.isLocked 
                        ? 'bg-gray-100 text-gray-500 border border-gray-200' 
                        : 'bg-white border border-gray-200 hover:border-blue-300'
                    }
                    ${assistant.isLocked ? 'cursor-pointer opacity-75' : 'cursor-pointer'}
                    transition-all duration-150
                  `}
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center mr-3 overflow-hidden">
                    {assistant.icon ? (
                      <Image 
                        src={assistant.icon} 
                        alt={assistant.name} 
                        width={40} 
                        height={40} 
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <User size={20} className="text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{assistant.name}</div>
                    {assistant.description && (
                      <div className="text-xs text-gray-500 truncate">{assistant.description}</div>
                    )}
                  </div>
                  {assistant.isLocked && (
                    <Lock size={16} className="ml-2 text-gray-400" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Password input for locked assistants */}
            {attemptingUnlock && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <form onSubmit={handlePasswordSubmit}>
                  <h3 className="text-sm font-medium mb-2">
                    Enter password to unlock
                  </h3>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md mb-2"
                    placeholder="Password"
                    autoFocus
                  />
                  {unlockError && (
                    <p className="text-xs text-red-500 mb-2">{unlockError}</p>
                  )}
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={cancelUnlock}
                      className="px-3 py-1 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Unlock
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">
          {/* Chat component (left side on larger screens) */}
          <div className="md:w-1/2 w-full overflow-hidden">
            {activeAssistant && (
              <div className="h-full">
                {React.cloneElement(chatComponent as React.ReactElement, {
                  assistantId: activeAssistant
                })}
              </div>
            )}
          </div>
          
          {/* Content component (right side on larger screens) */}
          <div className="md:w-1/2 w-full overflow-auto border-l border-gray-200">
            {contentComponent}
          </div>
        </div>
      </main>

      {/* Fixed Footer */}
      <footer 
        ref={footerRef} 
        className="border-t border-gray-200 bg-white fixed bottom-0 left-0 right-0 z-30"
      >
        <div className="container mx-auto px-6 py-1.5">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-xs text-gray-600 mb-1 md:mb-0">
              © 2025 Noyes AI. All rights reserved.
            </div>
            <div className="text-xs text-gray-600">
              Want help adding AI tools to your classroom? 
              <a href="mailto:ben@noyesai.com" className="text-blue-600 hover:underline ml-1">Contact us</a>
            </div>
            <div className="mt-1 md:mt-0">
              <Image 
                src="/logo.PNG" 
                alt="Noyes AI Logo" 
                width={60} 
                height={12} 
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MultiAssistantDemoLayout; 