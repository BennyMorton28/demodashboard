"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";

export default function CreateSuccessPage() {
  console.log("CreateSuccessPage component rendered");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  // Log all parameters for debugging
  console.log("Route params:", params);
  console.log("Search params:", Object.fromEntries([...searchParams.entries()]));
  
  const demoId = searchParams?.get("id");
  const title = searchParams?.get("title") || "Your Demo";
  const [countdown, setCountdown] = useState(5);

  // Log the final values we're using
  console.log(`Using demoId: ${demoId}, title: ${title}`);

  // Redirect after 5 seconds
  useEffect(() => {
    if (!demoId) {
      console.log("No demoId found, skipping redirect timer");
      return;
    }
    
    const targetPath = `/demos/${demoId}`;
    console.log(`Setting up redirect timer to: ${targetPath}`);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          console.log(`Timer completed, redirecting to: ${targetPath}`);
          clearInterval(timer);
          router.push(targetPath);
          return 0;
        }
        console.log(`Countdown: ${prev - 1}`);
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      console.log("Cleaning up timer");
      clearInterval(timer);
    };
  }, [demoId, router]);

  if (!demoId) {
    console.log("Rendering error state due to missing demoId");
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Missing Demo Information</h2>
          <p className="text-gray-600 mb-6">We couldn't find the demo information needed to redirect you.</p>
          <p className="text-sm text-gray-500 mb-4">Debug info:</p>
          <pre className="bg-gray-100 p-2 rounded text-left text-xs overflow-auto">
            {JSON.stringify({ params, searchParams: Object.fromEntries([...searchParams.entries()]) }, null, 2)}
          </pre>
          <Link 
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mt-4"
          >
            Return to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  console.log("Rendering success state with countdown:", countdown);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-green-500 mb-6">
          <CheckCircle className="h-16 w-16 mx-auto" />
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-4">Demo Created Successfully!</h2>
        
        <div className="mb-8">
          <p className="text-gray-700 text-center mb-2">
            Your <span className="font-medium">{title}</span> demo has been successfully created and is ready to use.
          </p>
          <p className="text-gray-500 text-center text-sm">
            You will be redirected in {countdown} seconds...
          </p>
        </div>
        
        <div className="flex justify-center">
          <Link
            href={`/demos/${demoId}`}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Demo Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
} 