"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PlusIcon, InfoIcon, XIcon, CheckIcon } from "lucide-react";

// Tooltip component
const Tooltip = ({ content, children }: { content: React.ReactNode, children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX - 100
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };
  
  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <div className="relative inline-block">
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 w-72 bg-black text-white text-xs p-2 rounded shadow-lg"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

interface AddDemoButtonProps {
  onDemoAdded?: () => void;
}

export default function AddDemoButton({ onDemoAdded }: AddDemoButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [wasRenamed, setWasRenamed] = useState(false);
  const [createdDemoId, setCreatedDemoId] = useState("");
  const [originalDemoId, setOriginalDemoId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

  // Form state
  const [demoTitle, setDemoTitle] = useState("");
  const [assistantTitle, setAssistantTitle] = useState("");
  const [assistantDescription, setAssistantDescription] = useState("");
  const [promptFile, setPromptFile] = useState<File | null>(null);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [previewIcon, setPreviewIcon] = useState<string | null>(null);

  const verifyPassword = () => {
    if (password === "pickles") {
      setPasswordVerified(true);
      setError("");
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  const handlePromptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPromptFile(e.target.files[0]);
    }
  };

  const handleContentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setContentFile(e.target.files[0]);
    }
  };

  const handleIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIconFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewIcon(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // Validate form
      if (!demoTitle || !assistantTitle || !promptFile || !contentFile) {
        setError("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      // Create form data
      const formData = new FormData();
      formData.append("password", password);
      formData.append("demoTitle", demoTitle);
      formData.append("assistantTitle", assistantTitle);
      formData.append("assistantDescription", assistantDescription);
      formData.append("promptFile", promptFile);
      formData.append("contentFile", contentFile);
      if (iconFile) {
        formData.append("iconFile", iconFile);
      }

      // Send to API
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Something went wrong");
      }

      // Success!
      setSuccess(true);
      
      // Capture the rename information if available
      if (result.wasRenamed) {
        setWasRenamed(true);
        setCreatedDemoId(result.demoId);
        setOriginalDemoId(result.originalId);
      }
      
      // Set success message
      setSuccessMessage(result.message || "Your demo has been created successfully!");
      
      // Call the onDemoAdded callback if provided
      if (onDemoAdded) {
        onDemoAdded();
      }
      
      // Add a delay before redirecting to the new demo
      setTimeout(() => {
        router.push(`/demos/${result.demoId}`);
        router.refresh();
      }, 3000); // Increased to 3 seconds to give time to read the message
    } catch (err: any) {
      setError(err.message || "Failed to create demo");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate initials icon if no icon selected
  const generateInitialsIcon = () => {
    if (!demoTitle) return null;
    
    const words = demoTitle.split(' ');
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
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed top-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-colors"
        title="Add New Demo"
      >
        <PlusIcon size={24} />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {!passwordVerified
                    ? "Authentication Required"
                    : success
                    ? "Demo Created Successfully!"
                    : "Create New Demo"}
                </h2>
                {!success && (
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XIcon size={24} />
                  </button>
                )}
              </div>

              {!passwordVerified ? (
                <div>
                  <p className="mb-4">Please enter the password to continue:</p>
                  <div className="flex space-x-2">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) => e.key === "Enter" && verifyPassword()}
                    />
                    <button
                      onClick={verifyPassword}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Verify
                    </button>
                  </div>
                  {error && <p className="mt-2 text-red-500">{error}</p>}
                </div>
              ) : success ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckIcon size={32} className="text-green-600" />
                  </div>
                  <p className="text-lg mb-2">{successMessage || "Your demo has been created successfully!"}</p>
                  {wasRenamed && (
                    <div className="bg-blue-50 p-3 rounded-md text-blue-800 my-3 text-sm">
                      <p><strong>Note:</strong> Your demo ID was automatically adjusted to avoid conflicts.</p>
                      <p className="mt-1">
                        Original ID: <code className="bg-blue-100 px-1 rounded">{originalDemoId}</code> → 
                        New ID: <code className="bg-blue-100 px-1 rounded">{createdDemoId}</code>
                      </p>
                    </div>
                  )}
                  <p className="text-gray-600">Redirecting you to your new demo in a moment...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    {/* Demo Title */}
                    <div>
                      <div className="flex items-center mb-1">
                        <label htmlFor="demoTitle" className="block text-sm font-medium text-gray-700">
                          Demo Title <span className="text-red-500">*</span>
                        </label>
                        <Tooltip content="This will be the main title of your demo, displayed in the dashboard card and on the demo page. (Max 50 characters)">
                          <button
                            type="button"
                            className="ml-1 text-gray-400 hover:text-gray-500"
                          >
                            <InfoIcon size={16} />
                          </button>
                        </Tooltip>
                      </div>
                      <input
                        id="demoTitle"
                        type="text"
                        value={demoTitle}
                        onChange={(e) => setDemoTitle(e.target.value.substring(0, 50))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={50}
                        required
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {demoTitle.length}/50 characters
                      </div>
                    </div>

                    {/* Assistant Title */}
                    <div>
                      <div className="flex items-center mb-1">
                        <label htmlFor="assistantTitle" className="block text-sm font-medium text-gray-700">
                          Assistant Title <span className="text-red-500">*</span>
                        </label>
                        <Tooltip content="This will be displayed as the title of the assistant in the chat interface. (Max 30 characters)">
                          <button
                            type="button"
                            className="ml-1 text-gray-400 hover:text-gray-500"
                          >
                            <InfoIcon size={16} />
                          </button>
                        </Tooltip>
                      </div>
                      <input
                        id="assistantTitle"
                        type="text"
                        value={assistantTitle}
                        onChange={(e) => setAssistantTitle(e.target.value.substring(0, 30))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={30}
                        required
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {assistantTitle.length}/30 characters
                      </div>
                    </div>

                    {/* Assistant Description */}
                    <div>
                      <div className="flex items-center mb-1">
                        <label htmlFor="assistantDescription" className="block text-sm font-medium text-gray-700">
                          Assistant Description
                        </label>
                        <Tooltip content="A short description of what this assistant does. This will be displayed under the assistant title. (Max 100 characters)">
                          <button
                            type="button"
                            className="ml-1 text-gray-400 hover:text-gray-500"
                          >
                            <InfoIcon size={16} />
                          </button>
                        </Tooltip>
                      </div>
                      <textarea
                        id="assistantDescription"
                        value={assistantDescription}
                        onChange={(e) => setAssistantDescription(e.target.value.substring(0, 100))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={100}
                        rows={2}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {assistantDescription.length}/100 characters
                      </div>
                    </div>

                    {/* Prompt File */}
                    <div>
                      <div className="flex items-center mb-1">
                        <label htmlFor="promptFile" className="block text-sm font-medium text-gray-700">
                          Prompt File (Markdown) <span className="text-red-500">*</span>
                        </label>
                        <Tooltip content="Upload a markdown file containing the system prompt for your assistant. This defines how the assistant behaves and responds.">
                          <button
                            type="button"
                            className="ml-1 text-gray-400 hover:text-gray-500"
                          >
                            <InfoIcon size={16} />
                          </button>
                        </Tooltip>
                      </div>
                      <input
                        id="promptFile"
                        type="file"
                        onChange={handlePromptFileChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        accept=".md,.txt"
                        required
                      />
                      {promptFile && (
                        <div className="text-xs text-gray-500 mt-1">
                          Selected file: {promptFile.name}
                        </div>
                      )}
                    </div>

                    {/* Content File */}
                    <div>
                      <div className="flex items-center mb-1">
                        <label htmlFor="contentFile" className="block text-sm font-medium text-gray-700">
                          Content File (Markdown) <span className="text-red-500">*</span>
                        </label>
                        <Tooltip content="Upload a markdown file containing the content to be displayed in the right side of the demo screen.">
                          <button
                            type="button"
                            className="ml-1 text-gray-400 hover:text-gray-500"
                          >
                            <InfoIcon size={16} />
                          </button>
                        </Tooltip>
                      </div>
                      <input
                        id="contentFile"
                        type="file"
                        onChange={handleContentFileChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        accept=".md,.txt"
                        required
                      />
                      {contentFile && (
                        <div className="text-xs text-gray-500 mt-1">
                          Selected file: {contentFile.name}
                        </div>
                      )}
                    </div>

                    {/* Icon File */}
                    <div>
                      <div className="flex items-center mb-1">
                        <label htmlFor="iconFile" className="block text-sm font-medium text-gray-700">
                          Icon Image
                        </label>
                        <Tooltip content="Upload a square image for your demo icon. If not provided, we'll create an icon with the first two letters of your demo title.">
                          <button
                            type="button"
                            className="ml-1 text-gray-400 hover:text-gray-500"
                          >
                            <InfoIcon size={16} />
                          </button>
                        </Tooltip>
                      </div>
                      <input
                        id="iconFile"
                        type="file"
                        onChange={handleIconFileChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        accept=".jpg,.jpeg,.png,.svg"
                      />
                      
                      <div className="flex items-center mt-3">
                        <div className="mr-4">
                          <p className="text-xs text-gray-700 mb-1">Icon Preview:</p>
                          <div className="bg-gray-100 rounded-lg p-3 w-16 h-16 flex items-center justify-center overflow-hidden">
                            {previewIcon ? (
                              <img 
                                src={previewIcon} 
                                alt="Icon preview" 
                                className="max-w-full max-h-full"
                              />
                            ) : demoTitle ? (
                              <div className="text-gray-700 text-2xl font-bold">
                                {generateInitialsIcon()}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">No icon</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            {previewIcon 
                              ? "Custom icon uploaded" 
                              : demoTitle 
                                ? `Using initials: ${generateInitialsIcon()}` 
                                : "Enter a title to generate initials or upload an image"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {error && <p className="text-red-500">{error}</p>}

                    <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating...
                          </>
                        ) : (
                          "Create Demo"
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 