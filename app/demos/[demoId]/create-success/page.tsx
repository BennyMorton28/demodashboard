"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";

export default function CreateSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get parameters from URL
  const demoId = searchParams?.get("id") || "";
  const title = searchParams?.get("title") || "Your Demo";
  const description = searchParams?.get("description") || "Your demo has been created successfully.";
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!demoId) {
      router.push("/");
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(`/demos/${demoId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, demoId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">{title}</h2>
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        </div>

        <div className="mt-8">
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Redirecting in {countdown} seconds...</span>
              {countdown > 0 ? (
                <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
              ) : (
                <ArrowRight className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-1000"
                style={{ width: `${(countdown / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 