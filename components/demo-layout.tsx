"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

interface DemoLayoutProps {
  title: string;
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
}

const DemoLayout: React.FC<DemoLayoutProps> = ({ title, leftContent, rightContent }) => {
  const [footerHeight, setFooterHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(64); // Default
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
        {/* Left side */}
        <div className="w-1/2 border-r border-gray-200 overflow-hidden relative">
          {leftContent}
        </div>
        
        {/* Right side */}
        <div className="w-1/2 overflow-hidden relative">
          {rightContent}
        </div>
      </main>

      {/* Fixed Footer */}
      <footer 
        ref={footerRef} 
        className="border-t border-gray-200 bg-white fixed bottom-0 left-0 right-0 z-30"
      >
        <div className="container mx-auto px-6 py-3">
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
};

export default DemoLayout; 