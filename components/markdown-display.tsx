"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

const MarkdownDisplay = () => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentId, setCurrentId] = useState('default');
  const [error, setError] = useState('');
  const router = useRouter();

  const availableContent = [
    { id: 'default', label: 'Welcome' },
    { id: 'about', label: 'About' },
    { id: 'features', label: 'Features' }
  ];

  const fetchMarkdownContent = async (id = 'default') => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/markdown?id=${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }
      
      const data = await response.json();
      setContent(data.content);
      setCurrentId(id);
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
      {/* Navigation bar for different content options */}
      <div className="border-b border-gray-200 bg-white">
        <div className="p-4 flex items-center space-x-4 overflow-x-auto">
          {availableContent.map(item => (
            <button
              key={item.id}
              onClick={() => fetchMarkdownContent(item.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${currentId === item.id 
                  ? 'bg-black text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
            >
              {item.label}
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
                onClick={() => fetchMarkdownContent(currentId)}
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