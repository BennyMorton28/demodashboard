"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

const MarkdownDisplay = () => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchMarkdownContent = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/markdown?id=default`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }
      
      const data = await response.json();
      setContent(data.content);
    } catch (error) {
      console.error('Error fetching markdown content:', error);
      setError('Failed to load content. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkdownContent();
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Content area - No tabs */}
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
                onClick={() => fetchMarkdownContent()}
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

export default MarkdownDisplay; 