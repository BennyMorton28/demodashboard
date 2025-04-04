"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter, usePathname } from 'next/navigation';

interface DemoMarkdownDisplayProps {
  demoId?: string;
}

const DemoMarkdownDisplay: React.FC<DemoMarkdownDisplayProps> = ({ demoId }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState('default');
  const [error, setError] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  
  // Extract demo ID from pathname if not provided as prop
  const getDemoId = () => {
    if (demoId) return demoId;
    
    // Extract demo ID from pathname (e.g., /demos/knowledge-assistant)
    const pathParts = pathname?.split('/') || [];
    return pathParts[pathParts.length - 1] || 'knowledge-assistant';
  };

  const currentDemoId = getDemoId();

  const availableSections = [
    { id: 'default', label: 'Overview' },
    { id: 'prompt', label: 'Prompt' },
    { id: 'implementation', label: 'Implementation' }
  ];

  const fetchDemoContent = async (section = 'default') => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/markdown/demo-info?demo=${currentDemoId}&section=${section}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch demo information');
      }
      
      const data = await response.json();
      setContent(data.content);
      setCurrentSection(section);
    } catch (error) {
      console.error('Error fetching demo information:', error);
      setError('Failed to load demo information. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDemoContent();
  }, [currentDemoId]);

  return (
    <div className="h-full flex flex-col">
      {/* Navigation bar for different sections */}
      <div className="border-b border-gray-200 bg-white">
        <div className="p-4 flex items-center space-x-4 overflow-x-auto">
          {availableSections.map(section => (
            <button
              key={section.id}
              onClick={() => fetchDemoContent(section.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${currentSection === section.id 
                  ? 'bg-black text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-red-500 text-center p-8">
              <p className="text-lg font-medium">{error}</p>
              <button
                onClick={() => fetchDemoContent(currentSection)}
                className="mt-4 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 max-w-3xl mx-auto">
            <ReactMarkdown className="prose prose-slate max-w-none">
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoMarkdownDisplay; 