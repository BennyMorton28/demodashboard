"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PlusIcon, InfoIcon, XIcon, CheckIcon } from "lucide-react";
import Link from "next/link";
import MultiAssistantForm from "./multi-assistant-form";

// Import the Assistant type from the multi-assistant-form
import { Assistant } from "./multi-assistant-form";

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

// Enhanced debug logging function
function safeStringify(obj: any): string {
  try {
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj === 'function') return '[Function]';
    if (typeof obj === 'object') {
      // Try to safely extract error message and stack if it's an error
      if (obj instanceof Error) {
        return `Error: ${obj.message}\nStack: ${obj.stack}`;
      }
      
      // Try normal JSON stringify
      try {
        return JSON.stringify(obj, null, 2);
      } catch (e) {
        // If circular reference or other JSON issues, try a more defensive approach
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          return value;
        }, 2);
      }
    }
    return String(obj);
  } catch (e) {
    return `[Failed to stringify: ${String(e)}]`;
  }
}

export default function AddDemoButton({ onDemoAdded }: AddDemoButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'multi'>('single');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [demoTitle, setDemoTitle] = useState("");
  const [assistantTitle, setAssistantTitle] = useState("");
  const [assistantDescription, setAssistantDescription] = useState("");
  const [promptFile, setPromptFile] = useState<File | null>(null);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [previewIcon, setPreviewIcon] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [wasRenamed, setWasRenamed] = useState(false);
  const [createdDemoId, setCreatedDemoId] = useState("");
  const [originalDemoId, setOriginalDemoId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createdDemoPath, setCreatedDemoPath] = useState("");
  
  // Multi-assistant state
  const [assistants, setAssistants] = useState<Assistant[]>([
    {
      id: `assistant_${Date.now()}`,
      name: "",
      description: "",
      promptFile: null,
      iconFile: null,
      previewIcon: null,
      password: "",
      isLocked: false
    }
  ]);
  
  const router = useRouter();

  // Enhanced logger for debugging
  const logDebug = (message: string, data?: any) => {
    const logMessage = data 
      ? `${message}: ${safeStringify(data)}` 
      : message;
    
    console.log(logMessage);
    setDebugInfo(prev => `${prev}\n${logMessage}`.trim());
  };

  const verifyPassword = () => {
    if (password === "pickles") {
      setPasswordVerified(true);
      setError("");
    } else {
      setError("Incorrect password");
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
      
      // Preview the icon
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && e.target.result) {
          setPreviewIcon(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Simple function to convert text to base64
  const textToBase64 = (text: string): string => {
    try {
      return btoa(unescape(encodeURIComponent(text)));
    } catch (error) {
      logDebug("Error converting text to base64", error);
      return "";
    }
  };

  // Simple function to read a file as base64 (just for icon)
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result as string;
          // Extract base64 part if it's a data URL
          const base64 = result.includes('base64,') 
            ? result.split('base64,')[1] 
            : result;
          
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error(`Error reading file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setDebugInfo("Starting demo creation process...");

    try {
      // Create FormData
      logDebug("Creating FormData object...");
      const formData = new FormData();
      
      // Generate demoId from the title (lowercase, dash-separated)
      const demoId = demoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      logDebug(`Generated demoId from title: ${demoId}`);
      
      // Add paths to debug info for visibility
      logDebug(`Expected paths that will be created:`);
      logDebug(`- app/demos/${demoId}/page.tsx`);
      logDebug(`- app/demos/${demoId}/create-success/ (directory)`);
      logDebug(`- components/${demoId}-assistant.tsx`);
      logDebug(`- lib/prompts/${demoId}-prompt.md`);
      logDebug(`- public/markdown/${demoId}/ (directory)`);
      logDebug(`- public/icons/${demoId}.* (icon file)`);
      logDebug(`- data/demo-info/${demoId}.json (metadata)`);
      
      // Add basic form fields that are common to both
      formData.append("demoId", demoId);
      formData.append("password", password);
      formData.append("demoTitle", demoTitle);
      
      if (activeTab === 'single') {
        // Validate single-assistant form
        if (!demoTitle || !assistantTitle || !promptFile || !contentFile) {
          const missingFields: string[] = [];
          if (!demoTitle) missingFields.push('Demo Title');
          if (!assistantTitle) missingFields.push('Assistant Title');
          if (!promptFile) missingFields.push('Prompt File');
          if (!contentFile) missingFields.push('Content File');
          
          const errorMsg = `Please fill in all required fields: ${missingFields.join(', ')}`;
          logDebug(`Validation error: ${errorMsg}`);
          setError(errorMsg);
          setIsSubmitting(false);
          return;
        }
        
        // Single-assistant specific fields
        formData.append("assistantTitle", assistantTitle);
        if (assistantDescription) {
          formData.append("assistantDescription", assistantDescription);
        }
        
        // Add files directly
        logDebug(`Adding files to FormData - promptFile: ${promptFile?.name}, contentFile: ${contentFile?.name}`);
        formData.append("promptFile", promptFile!);
        formData.append("contentFile", contentFile!);
      } else {
        // Multi-assistant validation
        if (!demoTitle || !contentFile) {
          const missingFields: string[] = [];
          if (!demoTitle) missingFields.push('Demo Title');
          if (!contentFile) missingFields.push('Content File');
          
          const errorMsg = `Please fill in all required fields: ${missingFields.join(', ')}`;
          logDebug(`Validation error: ${errorMsg}`);
          setError(errorMsg);
          setIsSubmitting(false);
          return;
        }
        
        // Validate assistants
        const invalidAssistants = assistants.filter(a => !a.name || !a.promptFile);
        if (invalidAssistants.length > 0) {
          const errorMsg = "Please fill in all required fields for each assistant (Name and Prompt File)";
          logDebug(`Validation error: ${errorMsg}`);
          setError(errorMsg);
          setIsSubmitting(false);
          return;
        }
        
        // Validate locked assistants have passwords
        const lockedWithoutPassword = assistants.filter(a => a.isLocked && !a.password);
        if (lockedWithoutPassword.length > 0) {
          const errorMsg = "All locked assistants must have a password";
          logDebug(`Validation error: ${errorMsg}`);
          setError(errorMsg);
          setIsSubmitting(false);
          return;
        }
        
        // Multi-assistant specific fields
        formData.append("isMultiAssistant", "true");
        formData.append("assistantsCount", assistants.length.toString());
        
        // Add each assistant's data
        assistants.forEach((assistant, index) => {
          formData.append(`assistant_${index}_name`, assistant.name);
          formData.append(`assistant_${index}_promptFile`, assistant.promptFile!);
          if (assistant.description) {
            formData.append(`assistant_${index}_description`, assistant.description);
          }
          if (assistant.iconFile) {
            formData.append(`assistant_${index}_iconFile`, assistant.iconFile);
          }
          formData.append(`assistant_${index}_isLocked`, assistant.isLocked.toString());
          if (assistant.isLocked) {
            formData.append(`assistant_${index}_password`, assistant.password);
          }
        });
        
        // Add content file (for multi-assistant)
        formData.append("contentFile", contentFile!);
      }
      
      // Validate file sizes
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      
      if (iconFile && iconFile.size > MAX_FILE_SIZE) {
        const errorMsg = `Icon file is too large (max 5MB): ${(iconFile.size / (1024 * 1024)).toFixed(2)}MB`;
        logDebug(`File size error: ${errorMsg}`);
        setError(errorMsg);
        setIsSubmitting(false);
        return;
      }

      // Add icon if provided (common to both types)
      if (iconFile) {
        logDebug(`Adding icon file: ${iconFile.name}`);
        formData.append("iconFile", iconFile);
      }
      
      // Send as FormData
      try {
        logDebug("Starting fetch request to /api/upload with FormData...");
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        
        logDebug(`Response received with status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          let errorMessage = `Server error: ${response.status} ${response.statusText}`;
          
          try {
            const errorText = await response.text();
            logDebug(`Error response body: ${errorText}`);
            
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorJson.details || errorMessage;
              logDebug("Parsed error JSON:", errorJson);
            } catch (jsonParseError: any) {
              logDebug("Failed to parse error response as JSON", jsonParseError);
              // Use the raw text if JSON parsing fails
              if (errorText && errorText.trim()) {
                errorMessage = `Server error: ${errorText}`;
              }
            }
          } catch (responseTextError: any) {
            logDebug("Failed to read error response text", responseTextError);
            // Keep the original error message if we can't read the response
          }
          
          throw new Error(errorMessage);
        }
        
        // Process successful response
        logDebug("Successful response, parsing JSON...");
        let result;
        
        try {
          result = await response.json();
          logDebug("Response JSON parsed successfully:", result);
        } catch (jsonError: any) {
          logDebug("Error parsing response JSON", jsonError);
          throw new Error(`Failed to parse success response: ${jsonError.message || 'Unknown error'}`);
        }
        
        // Success!
        logDebug("Demo creation successful!", result);
        setSuccess(true);
        
        // Capture the rename information if available
        if (result.wasRenamed) {
          setWasRenamed(true);
          setCreatedDemoId(result.demoId);
          setOriginalDemoId(result.originalId);
          logDebug(`Demo was renamed: ${result.originalId} -> ${result.demoId}`);
        }
        
        // Set success message
        const successMsg = result.message || "Your demo has been created successfully!";
        setSuccessMessage(successMsg);
        logDebug(`Setting success message: ${successMsg}`);
        
        // Call the onDemoAdded callback if provided
        if (onDemoAdded) {
          logDebug("Calling onDemoAdded callback");
          onDemoAdded();
        }
        
        // Store the demo ID for navigation
        const newDemoPath = `/demos/${result.demoId}/create-success?id=${result.demoId}&title=${encodeURIComponent(assistantTitle)}&debug=true`;
        setCreatedDemoPath(newDemoPath);
        logDebug(`Setting navigation path: ${newDemoPath}`);
        
        // Add a delay before redirecting to the success page
        logDebug(`Redirecting to success page in 3 seconds...`);
        
        // Start the countdown for redirection
        setTimeout(() => {
          logDebug(`Redirecting to ${newDemoPath}`);
          router.push(newDemoPath);
          router.refresh();
        }, 3000);
        
        return result;
      } catch (fetchError: any) {
        logDebug("Fetch error details:", {
          message: fetchError.message,
          stack: fetchError.stack,
          name: fetchError.name,
          cause: fetchError.cause,
          toString: fetchError.toString(),
          constructor: fetchError.constructor?.name
        });
        throw fetchError;
      }
    } catch (err: any) {
      const errorDetails = {
        message: err.message,
        stack: err.stack,
        name: err.name,
        cause: err.cause,
        toString: err.toString(),
        constructor: err.constructor?.name
      };
      
      logDebug("Demo creation error details:", errorDetails);
      console.error("Demo creation error details:", errorDetails);
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
                  <p className="text-gray-600 mb-4">Redirecting you to your new demo in a moment...</p>
                  
                  {/* Enhanced debugging view - always visible */}
                  <div className="mt-4 border border-gray-200 rounded-md p-4 bg-gray-50 text-left">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">Creation Debug Log</h3>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-300 max-h-60 overflow-y-auto text-xs font-mono whitespace-pre-wrap">
                      {debugInfo || "No debug information available"}
                    </div>
                  </div>
                  
                  {/* Fallback link in case auto-redirect doesn't work */}
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">If you're not redirected automatically:</p>
                    <Link 
                      href={createdDemoPath} 
                      className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Go to Demo Now
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Tab selector */}
                  <div className="mb-6 border-b border-gray-200">
                    <div className="flex space-x-1">
                      <button
                        className={`py-2 px-4 border-b-2 font-medium ${
                          activeTab === 'single' 
                            ? 'border-blue-500 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveTab('single')}
                      >
                        Create One Assistant Demo
                      </button>
                      <button
                        className={`py-2 px-4 border-b-2 font-medium ${
                          activeTab === 'multi' 
                            ? 'border-blue-500 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveTab('multi')}
                      >
                        Create Multiple Assistant Demo
                      </button>
                    </div>
                  </div>

                  {activeTab === 'single' ? (
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
                                Processing...
                              </>
                            ) : (
                              "Create Demo"
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-4">
                        Create a demo with multiple assistants that users can choose from.
                        Each assistant can have its own prompt and appearance.
                      </p>
                      
                      <form onSubmit={handleSubmit}>
                        <div className="space-y-6">
                          {/* Demo Title */}
                          <div>
                            <div className="flex items-center mb-1">
                              <label htmlFor="multiDemoTitle" className="block text-sm font-medium text-gray-700">
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
                              id="multiDemoTitle"
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

                          {/* Content File */}
                          <div>
                            <div className="flex items-center mb-1">
                              <label htmlFor="multiContentFile" className="block text-sm font-medium text-gray-700">
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
                              id="multiContentFile"
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
                              <label htmlFor="multiIconFile" className="block text-sm font-medium text-gray-700">
                                Demo Icon Image
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
                              id="multiIconFile"
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

                          {/* Multiple Assistants */}
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-medium text-gray-800 mb-4">Assistant Configuration</h3>
                            <MultiAssistantForm
                              assistants={assistants}
                              setAssistants={setAssistants}
                              onError={setError}
                            />
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
                                  Processing...
                                </>
                              ) : (
                                "Create Multi-Assistant Demo"
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 