"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter, usePathname } from 'next/navigation';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface DemoMarkdownDisplayProps {
  demoId?: string;
}

const DemoMarkdownDisplay: React.FC<DemoMarkdownDisplayProps> = ({ demoId }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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

  // Use only default section, removing tabs
  const fetchDemoContent = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/markdown/demo-info?demo=${currentDemoId}&section=default`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch demo information');
      }
      
      const data = await response.json();
      setContent(data.content);
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
    <div className="h-full w-full flex flex-col">
      {/* Content area with scrolling and bottom padding */}
      <div className="h-full w-full overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-red-500 text-center p-8">
              <p className="text-lg font-medium">{error}</p>
              <button
                onClick={() => fetchDemoContent()}
                className="mt-4 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 pb-20 max-w-3xl mx-auto">
            <ReactMarkdown 
              className="prose prose-slate max-w-none"
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoMarkdownDisplay; 