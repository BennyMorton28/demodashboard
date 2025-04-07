"use client";

import React, { useState } from "react";
import { PlusIcon, XIcon, AlertCircleIcon, UserIcon, LockIcon, UnlockIcon } from "lucide-react";

export type Assistant = {
  id: string;
  name: string;
  description: string;
  promptFile: File | null;
  iconFile: File | null;
  previewIcon: string | null;
  password: string;
  isLocked: boolean;
};

interface MultiAssistantFormProps {
  assistants: Assistant[];
  setAssistants: React.Dispatch<React.SetStateAction<Assistant[]>>;
  onError: (error: string) => void;
}

const MultiAssistantForm: React.FC<MultiAssistantFormProps> = ({
  assistants,
  setAssistants,
  onError
}) => {
  // Function to add a new assistant
  const addAssistant = () => {
    const newId = `assistant_${Date.now()}`;
    setAssistants(prev => [
      ...prev,
      {
        id: newId,
        name: "",
        description: "",
        promptFile: null,
        iconFile: null,
        previewIcon: null,
        password: "",
        isLocked: false
      }
    ]);
  };

  // Function to remove an assistant
  const removeAssistant = (id: string) => {
    if (assistants.length <= 1) {
      onError("You must have at least one assistant");
      return;
    }
    setAssistants(prev => prev.filter(assistant => assistant.id !== id));
  };

  // Function to update assistant field
  const updateAssistant = (id: string, field: keyof Assistant, value: any) => {
    setAssistants(prev => 
      prev.map(assistant => 
        assistant.id === id ? { ...assistant, [field]: value } : assistant
      )
    );
  };

  // Function to handle icon file selection
  const handleIconFileChange = (id: string, file: File) => {
    // Preview the icon
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && e.target.result) {
        updateAssistant(id, 'previewIcon', e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    
    // Set the file
    updateAssistant(id, 'iconFile', file);
  };

  // Generate initials icon preview
  const generateInitialsIcon = (name: string) => {
    if (!name) return null;
    
    const words = name.split(' ');
    let initials = '';
    
    if (words.length === 1) {
      // If only one word, take first two letters
      initials = words[0].substring(0, 2);
    } else {
      // Otherwise take first letter of first two words
      initials = words.slice(0, 2).map(word => word.charAt(0)).join('');
    }
    
    return initials.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <p className="mb-4 text-gray-700">
        Configure multiple assistants for your demo. Each assistant can have their own appearance, prompt, and access requirements.
      </p>
      
      {assistants.map((assistant, index) => (
        <div 
          key={assistant.id} 
          className="p-4 border border-gray-200 rounded-lg bg-white relative"
        >
          <div className="absolute top-2 right-2">
            <button
              type="button"
              onClick={() => removeAssistant(assistant.id)}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700"
              aria-label="Remove assistant"
            >
              <XIcon size={18} />
            </button>
          </div>
          
          <div className="mb-4 font-medium text-gray-700">
            Assistant {index + 1}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assistant Name */}
            <div>
              <label htmlFor={`name-${assistant.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                Assistant Name <span className="text-red-500">*</span>
              </label>
              <input
                id={`name-${assistant.id}`}
                type="text"
                value={assistant.name}
                onChange={(e) => updateAssistant(assistant.id, 'name', e.target.value.substring(0, 30))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={30}
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {assistant.name.length}/30 characters
              </div>
            </div>
            
            {/* Assistant Icon */}
            <div>
              <label htmlFor={`icon-${assistant.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                Assistant Icon
              </label>
              <div className="flex items-center">
                <div className="mr-3">
                  <div className="bg-gray-100 rounded-lg p-3 w-12 h-12 flex items-center justify-center overflow-hidden">
                    {assistant.previewIcon ? (
                      <img 
                        src={assistant.previewIcon} 
                        alt="Icon preview" 
                        className="max-w-full max-h-full"
                      />
                    ) : assistant.name ? (
                      <div className="text-gray-700 text-lg font-bold">
                        {generateInitialsIcon(assistant.name)}
                      </div>
                    ) : (
                      <UserIcon size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>
                <input
                  id={`icon-${assistant.id}`}
                  type="file"
                  onChange={(e) => e.target.files && e.target.files[0] && handleIconFileChange(assistant.id, e.target.files[0])}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md"
                  accept=".jpg,.jpeg,.png,.svg"
                />
              </div>
            </div>
            
            {/* Assistant Description */}
            <div className="md:col-span-2">
              <label htmlFor={`description-${assistant.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                Assistant Description
              </label>
              <textarea
                id={`description-${assistant.id}`}
                value={assistant.description}
                onChange={(e) => updateAssistant(assistant.id, 'description', e.target.value.substring(0, 100))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={100}
                rows={2}
              />
              <div className="text-xs text-gray-500 mt-1">
                {assistant.description.length}/100 characters
              </div>
            </div>
            
            {/* Prompt File */}
            <div className="md:col-span-2">
              <label htmlFor={`prompt-${assistant.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                Prompt File (Markdown) <span className="text-red-500">*</span>
              </label>
              <input
                id={`prompt-${assistant.id}`}
                type="file"
                onChange={(e) => e.target.files && e.target.files[0] && updateAssistant(assistant.id, 'promptFile', e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                accept=".md,.txt"
                required
              />
              {assistant.promptFile && (
                <div className="text-xs text-gray-500 mt-1">
                  Selected file: {assistant.promptFile.name}
                </div>
              )}
            </div>
            
            {/* Lock Settings */}
            <div className="md:col-span-2 pt-2 border-t border-gray-100 mt-2">
              <div className="flex items-center mb-2">
                <input
                  id={`locked-${assistant.id}`}
                  type="checkbox"
                  checked={assistant.isLocked}
                  onChange={(e) => updateAssistant(assistant.id, 'isLocked', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor={`locked-${assistant.id}`} className="ml-2 text-sm font-medium text-gray-700 flex items-center">
                  {assistant.isLocked ? (
                    <>
                      <LockIcon size={14} className="inline-block mr-1 text-yellow-500" />
                      Require password to access
                    </>
                  ) : (
                    <>
                      <UnlockIcon size={14} className="inline-block mr-1 text-green-500" />
                      Available to all users
                    </>
                  )}
                </label>
              </div>
              
              {assistant.isLocked && (
                <div className="ml-6 mt-2">
                  <label htmlFor={`password-${assistant.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                    Access Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`password-${assistant.id}`}
                    type="text"
                    value={assistant.password}
                    onChange={(e) => updateAssistant(assistant.id, 'password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password for this assistant"
                    required={assistant.isLocked}
                  />
                  <div className="text-xs text-gray-500 mt-1 flex items-center">
                    <AlertCircleIcon size={12} className="mr-1 text-yellow-500" />
                    Users will need this password to unlock the assistant
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      
      <button
        type="button"
        onClick={addAssistant}
        className="flex items-center justify-center w-full py-2 mt-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg border border-gray-300"
      >
        <PlusIcon size={16} className="mr-1" />
        Add Another Assistant
      </button>
      
      {assistants.length === 0 && (
        <div className="p-6 text-center bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-500">No assistants added yet</p>
          <button
            type="button"
            onClick={addAssistant}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Your First Assistant
          </button>
        </div>
      )}
    </div>
  );
};

export default MultiAssistantForm; 