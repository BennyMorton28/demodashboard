"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { CheckCircle, ArrowRight, Loader2, AlertTriangle, Bug, RefreshCw, FileCheck, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

// Interface for validation results
interface ValidationDetails {
  exists: boolean;
  path: string;
  error?: string;
}

interface ValidationResult {
  success: boolean;
  details: {
    [key: string]: ValidationDetails;
  };
  structure?: any;
}

export default function CreateSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const demoId = searchParams?.get("id") || "";
  const title = searchParams?.get("title") || "Demo Created Successfully";
  const showDebug = searchParams?.get("debug") === "true";
  const description = searchParams?.get("desc") || `Your demo "${title}" has been created and is ready to use.`;

  const [countdown, setCountdown] = useState(5);
  const [redirectError, setRedirectError] = useState(false);
  const [autoRedirect, setAutoRedirect] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [expandStructure, setExpandStructure] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // Debug logger function
  const logDebug = (message: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLog(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  // Function to check demo creation status
  const checkDemoStatus = async (includeStructure: boolean = false) => {
    if (!demoId) return;
    
    setIsValidating(true);
    logDebug(`Checking demo creation status for: ${demoId}${includeStructure ? ' (with detailed structure)' : ''}`);
    
    try {
      const response = await fetch(`/api/check-demo-creation?id=${demoId}&includeStructure=${includeStructure}`);
      
      if (!response.ok) {
        logDebug(`Error response: ${response.status} ${response.statusText}`);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setValidationResult(data);
      
      // Log the validation results
      logDebug(`Validation success: ${data.success}`);
      
      // Count passing/failing checks
      const passCount = Object.values(data.details).filter((d: any) => d.exists).length;
      const totalCount = Object.values(data.details).length;
      logDebug(`File checks: ${passCount}/${totalCount} files found`);
      
      // Log any failures specifically
      const failedChecks = Object.entries(data.details)
        .filter(([_, details]: [string, any]) => !details.exists)
        .map(([key, details]: [string, any]) => `${key}: ${details.path}`);
      
      if (failedChecks.length > 0) {
        logDebug(`Failed checks (${failedChecks.length}):`);
        failedChecks.forEach(check => logDebug(`- ${check}`));
      }
      
      // If demo creation failed, stop the auto-redirect
      if (!data.success) {
        setAutoRedirect(false);
        logDebug(`⚠️ Demo validation failed - auto-redirect disabled`);
      }
    } catch (error) {
      logDebug(`Error checking demo status: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (!demoId) {
      // If no demoId in URL, redirect to home
      router.push("/");
      return;
    }

    // Initialize debug info
    logDebug(`Demo creation completed for: ${demoId}`);
    
    // Always check files in detail
    checkDemoStatus(true);

    let timer: NodeJS.Timeout | null = null;
    
    if (autoRedirect) {
      timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
            if (timer) clearInterval(timer);
            
            // Try to navigate to the demo page
            try {
              router.push(`/demos/${demoId}`);
            } catch (error) {
              console.error("Error navigating to demo page:", error);
              setRedirectError(true);
            }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [router, demoId, autoRedirect]);

  // Function to handle manual navigation
  const handleViewDemo = () => {
    try {
      router.push(`/demos/${demoId}`);
    } catch (error) {
      console.error("Error navigating to demo page:", error);
      setRedirectError(true);
    }
  };

  // Function to recheck demo status
  const handleRecheckStatus = () => {
    checkDemoStatus(true);
  };
  
  // Function to toggle structure view
  const toggleStructureView = () => {
    setExpandStructure(!expandStructure);
  };
  
  // Function to toggle auto-redirect
  const toggleAutoRedirect = () => {
    setAutoRedirect(!autoRedirect);
    logDebug(`Auto-redirect ${!autoRedirect ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Sticky debug panel that stays visible */}
      <div className="fixed top-2 right-2 z-50 max-w-lg w-full bg-white shadow-lg rounded-lg border border-gray-200 opacity-95 hover:opacity-100 transition-opacity">
        <div className="p-3 bg-gray-100 rounded-t-lg flex justify-between items-center">
          <div className="flex items-center">
            <Bug className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="font-medium text-blue-800">Demo Creation Debug</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleRecheckStatus}
              className="p-1 rounded hover:bg-gray-200 text-gray-700"
              title="Recheck Demo Status"
            >
              <RefreshCw size={16} className={isValidating ? "animate-spin" : ""} />
            </button>
            <button 
              onClick={toggleAutoRedirect}
              className={`p-1 rounded ${autoRedirect ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}
              title={autoRedirect ? "Auto-redirect enabled" : "Auto-redirect disabled"}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        
        <div className="p-3 max-h-80 overflow-y-auto">
          {/* Status summary */}
          {validationResult && (
            <div className={`p-2 mb-2 rounded text-sm ${validationResult.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-center">
                {validationResult.success ? 
                  <CheckCircle className="h-4 w-4 text-green-600 mr-1" /> : 
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mr-1" />
                }
                <span>
                  {validationResult.success ? 
                    'All required files created successfully' : 
                    'Demo creation may have issues - some files are missing'}
                </span>
              </div>
            </div>
          )}
          
          {/* File checks */}
          {validationResult && (
            <div className="text-xs font-mono mb-3 border rounded p-2">
              <div className="flex justify-between items-center mb-1 pb-1 border-b">
                <span className="font-semibold">File Status Check</span>
                <span className="text-gray-500">
                  {Object.values(validationResult.details).filter(d => d.exists).length}/{Object.values(validationResult.details).length} files found
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto">
                {Object.entries(validationResult.details).map(([key, details]) => (
                  <div key={key} className="py-1 flex items-start">
                    <span className={`inline-block mr-1 ${details.exists ? 'text-green-600' : 'text-red-600'}`}>
                      {details.exists ? '✓' : '✗'}
                    </span>
                    <div className="overflow-hidden">
                      <div className="font-semibold truncate">{key}</div>
                      <div className="text-gray-500 truncate text-xs">{details.path}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Debug log */}
          <div className="text-xs font-mono">
            <div className="flex justify-between items-center mb-1 pb-1 border-b">
              <span className="font-semibold">Debug Log</span>
              <span className="text-gray-500">{debugLog.length} entries</span>
            </div>
            <div className="bg-gray-50 p-2 max-h-32 overflow-y-auto">
              {debugLog.map((log, i) => (
                <div key={i} className="pb-1 whitespace-pre-wrap break-all">{log}</div>
              ))}
              {debugLog.length === 0 && (
                <div className="text-gray-500">No debug logs yet...</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-3xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">{title}</h2>
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        </div>

        <div className="mt-8">
          <div className="relative">
            {autoRedirect && !redirectError ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {countdown > 0 
                      ? `Redirecting in ${countdown} seconds...` 
                      : "Redirecting to your demo..."}
                  </span>
                  {countdown > 0 ? (
                    <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
                  ) : (
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-1000"
                    style={{ width: `${((5-countdown)/5) * 100}%` }}
                  />
                </div>
              </>
            ) : !redirectError ? (
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <div className="flex items-start">
                  <FileCheck className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm text-blue-700">
                      Auto-redirect is currently disabled.
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      You can manually access your demo using the buttons below when ready.
                    </p>
                    <button
                      onClick={toggleAutoRedirect}
                      className="mt-2 text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Enable Auto-Redirect
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 mt-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm text-yellow-700">
                      There was an issue navigating to your demo. It might still be processing.
                    </p>
                    <p className="text-sm text-yellow-700 mt-2">
                      Please try again in a moment or return to the dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex gap-4 justify-center">
            <button
              onClick={handleViewDemo}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              {validationResult && !validationResult.success ? (
                <AlertTriangle className="h-4 w-4 mr-1" />
              ) : null}
              View Demo
            </button>
            
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 