"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function DefaultDemoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const demoId = params?.demoId as string;
  const [error, setError] = useState(false);
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    
    // If authenticated, check if demo exists
    if (status === "authenticated" && demoId) {
      // This is a fallback page that appears temporarily while the app is rebuilding
      // or if there's an issue with the demo generation
      setError(true);
    }
  }, [status, router, demoId]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Demo Not Available</h2>
            <p className="mt-2 text-gray-600">
              The demo you're trying to access (<span className="font-mono text-sm bg-gray-100 px-1 rounded">{demoId}</span>) is not currently available.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-500">This could be due to:</p>
              <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
                <li>The demo is still being generated</li>
                <li>There was an error during demo creation</li>
                <li>The demo may have been removed</li>
              </ul>
            </div>
            <div className="mt-6">
              <Link 
                href="/"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 