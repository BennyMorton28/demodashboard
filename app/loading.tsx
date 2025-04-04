"use client";

import { usePathname } from "next/navigation";

export default function Loading() {
  const pathname = usePathname();
  
  // Determine the title based on the current path
  let title = "Loading";
  let subtitle = "Please wait while we prepare your experience";
  
  if (pathname === "/demos/kai" || pathname?.startsWith("/demos/kai/")) {
    title = "Loading Kai (Kellogg AI)";
  } else if (pathname === "/demos/knowledge-assistant" || pathname?.startsWith("/demos/knowledge-assistant/")) {
    title = "Loading Knowledge Assistant"; 
  } else if (pathname === "/demos/streaming-api" || pathname?.startsWith("/demos/streaming-api/")) {
    title = "Loading Streaming API Demo";
  } else if (pathname === "/demos/case-study" || pathname?.startsWith("/demos/case-study/")) {
    title = "Loading BMSD Case Study";
  } else if (pathname === "/demos/bmsd-case-study" || pathname?.startsWith("/demos/bmsd-case-study/")) {
    title = "Loading BMSD Case Study";
  } else {
    title = "Loading";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
} 