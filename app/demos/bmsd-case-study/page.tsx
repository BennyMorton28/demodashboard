"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React from "react";
import DemoMarkdownDisplay from "@/components/demo-markdown-display";
import { Menu, X } from "lucide-react";
import Image from "next/image";

// Create a simplified version of the BMSD Assistant component
// In a real implementation, this would use the full Character Selection and multi-character chat functionality
const BMSDAssistant = () => {
  return (
    <div className="h-full flex relative">
      {/* Left sidebar with character selection - simplified version */}
      <div className="w-[280px] min-w-[280px] bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold">Select Character</h2>
        </div>
        <div className="h-[calc(100%-57px)] overflow-y-auto p-4">
          <div className="flex flex-col space-y-2">
            {/* Characters list */}
            {[
              { id: 'emily_carter', name: 'Dr. Emily Carter', title: 'Superintendent' },
              { id: 'linda_johnson', name: 'Ms. Linda Johnson', title: 'Bus Driver' },
              { id: 'david_rodriguez', name: 'Mr. David Rodriguez', title: 'Principal' },
              { id: 'sarah_lee', name: 'Ms. Sarah Lee', title: 'Chief Operations Officer' },
              { id: 'james_thompson', name: 'Mr. James Thompson', title: 'Chief Financial Officer' }
            ].map((character) => (
              <button
                key={character.id}
                className={`flex flex-col items-start p-3 rounded-lg transition-colors 
                ${character.id === 'emily_carter' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-white border-2 border-gray-200 hover:border-blue-300'}`}
              >
                <div className="font-medium">{character.name}</div>
                <div className="text-sm text-gray-600">{character.title}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Chat Section - simplified version */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Character Info Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold">Dr. Emily Carter</h2>
          <p className="text-sm text-gray-600">Superintendent</p>
        </div>
        
        {/* Chat Component - Placeholder for demo purposes */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Welcome Message */}
            <div className="flex">
              <div className="mr-4 rounded-[16px] px-4 py-2 md:mr-24 text-black bg-white border border-gray-200 font-normal font-sans text-lg">
                <div className="whitespace-pre-wrap break-words">
                  Hello, I'm Dr. Emily Carter, Superintendent of BMSD. I'm committed to finding sustainable solutions to our transportation crisis while maintaining our district's commitment to educational equity. I'm here to discuss our challenges and explore potential paths forward.
                </div>
              </div>
            </div>
            
            {/* Placeholder for conversation */}
            <div className="flex justify-center mt-8">
              <div className="text-gray-500 text-center max-w-md">
                <p className="mb-4">This is a demo of the BMSD Transportation Case Study interface.</p>
                <p>In the full implementation, you would be able to chat with each character and receive responses based on their role and perspective.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Message Input - Placeholder */}
        <div className="p-3 border-t border-gray-200">
          <div className="mx-auto max-w-4xl">
            <div className="flex w-full items-end rounded-lg border border-gray-200 bg-white">
              <textarea
                placeholder="Message..."
                className="flex-1 resize-none border-0 bg-transparent p-3 focus:outline-none text-sm min-h-[44px] max-h-[200px]"
                disabled
              />
              <button
                disabled
                className="flex h-[44px] w-[44px] items-center justify-center rounded-r-lg bg-gray-100 text-gray-400"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M1.5 8L14.5 8M14.5 8L8 1.5M14.5 8L8 14.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BMSDCaseStudyDemo() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'chat' | 'content'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header with title and back button */}
      <header className="h-16 border-b border-gray-200 relative z-50 bg-white">
        <div className="container mx-auto h-full px-6">
          <div className="flex items-center justify-between h-full">
            <Link 
              href="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">BMSD Transportation Case Study</h1>
            <div className="w-24"></div> {/* Spacer for balance */}
          </div>
        </div>
      </header>

      {/* Mobile tabs - only visible on small screens */}
      <div className="md:hidden border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === 'chat' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500'
            }`}
          >
            Characters
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === 'content' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500'
            }`}
          >
            About
          </button>
        </div>
      </div>

      {/* Main content - Split layout on desktop, tabbed on mobile */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Mobile menu button - only visible when sidebar is hidden on mobile */}
        <div className="lg:hidden absolute top-3 left-4 z-20">
          {activeTab === 'chat' && !isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
          )}
        </div>
        
        {/* Left side - BMSD Assistant */}
        <div className={`
          md:w-1/2 w-full
          ${activeTab === 'chat' ? 'block' : 'hidden md:block'}
        `}>
          <BMSDAssistant />
        </div>
        
        {/* Right side - Demo Markdown Display */}
        <div className={`
          md:w-1/2 w-full overflow-auto
          ${activeTab === 'content' ? 'block' : 'hidden md:block'}
        `}>
          <DemoMarkdownDisplay demoId="bmsd-case-study" />
        </div>
      </main>

      {/* Footer */}
      <footer className="h-auto min-h-12 border-t border-gray-200 bg-white relative z-50 py-3">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-sm text-gray-600 mb-2 md:mb-0">
              © 2025 Noyes AI. All rights reserved.
            </div>
            <div className="text-sm text-gray-600">
              Want help adding AI tools to your classroom? 
              <a href="mailto:ben@noyesai.com" className="text-blue-600 hover:underline ml-1">Contact us</a>
            </div>
            <div className="mt-2 md:mt-0">
              <Image 
                src="/logo.PNG" 
                alt="Noyes AI Logo" 
                width={120} 
                height={24} 
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 