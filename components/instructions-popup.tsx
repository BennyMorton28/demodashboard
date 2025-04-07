import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const instructions = [
  {
    title: "Welcome to Knowledge Assistant",
    content: "This interactive assistant allows you to explore knowledge while interacting with an AI helper. The interface is designed to be intuitive and user-friendly."
  },
  {
    title: "How to Use This Tool",
    content: "Use the chat panel on the left to ask questions about the content displayed on the right. The AI will provide relevant information based on your queries."
  },
  {
    title: "Content Navigation",
    content: "You can navigate between different content sections using the tabs at the top of the right panel. Each section contains information on different topics."
  },
  {
    title: "Getting Help",
    content: "If you're not sure what to ask, you can use the suggested conversation starters or simply ask the AI for help navigating the content."
  }
];

export default function InstructionsPopup() {
  // Set isOpen to false by default to prevent popup from showing
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % instructions.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + instructions.length) % instructions.length);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{instructions[currentIndex].title}</h2>
          <p className="text-gray-700 whitespace-pre-line">{instructions[currentIndex].content}</p>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={prevSlide}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex gap-2">
            {instructions.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
} 