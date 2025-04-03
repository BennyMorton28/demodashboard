import React, { useState } from 'react';
import CharacterSelector from './character-selector';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [showCharacterSelector, setShowCharacterSelector] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-lg z-50">
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {showCharacterSelector ? (
            <CharacterSelector onClose={() => setIsOpen(false)} />
          ) : (
            <div className="p-4">
              {/* Other sidebar content */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
 