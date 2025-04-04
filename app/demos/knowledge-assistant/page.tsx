"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Assistant from "@/components/assistant";
import DemoMarkdownDisplay from "@/components/demo-markdown-display";
import Link from "next/link";
import React from "react";
import Image from "next/image";

export default function KnowledgeAssistantDemo() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'chat' | 'content'>('chat');
  
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
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Assistant</h1>
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
            Assistant
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === 'content' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500'
            }`}
          >
            Content
          </button>
        </div>
      </div>

      {/* Main content - Split layout on desktop, tabbed on mobile */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left side - Chatbot */}
        <div className={`
          md:w-1/2 w-full border-r border-gray-200
          ${activeTab === 'chat' ? 'block' : 'hidden md:block'}
        `}>
          <Assistant />
        </div>
        
        {/* Right side - Demo Markdown Display */}
        <div className={`
          md:w-1/2 w-full overflow-auto
          ${activeTab === 'content' ? 'block' : 'hidden md:block'}
        `}>
          <DemoMarkdownDisplay demoId="knowledge-assistant" />
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