"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Assistant from "@/components/assistant";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function Main() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

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
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header with title */}
      <header className="h-24 border-b border-gray-200 relative z-50 bg-white">
        <div className="container mx-auto h-full px-6">
          <div className="flex items-center justify-center h-full">
            <h1 className="text-2xl font-bold text-gray-900">BMSD Transportation Crisis Case Study</h1>
          </div>
        </div>
      </header>

      {/* Main content - fills available space */}
      <main className="flex-1 flex overflow-hidden relative">
        <div className="w-full">
          <Assistant />
        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 border-t border-gray-200 bg-white relative z-50">
        <div className="container mx-auto h-full px-6">
          <div className="flex items-center justify-between h-full">
            {/* Left side - empty for balance */}
            <div className="w-[150px]"></div>
            
            {/* Center content */}
            <div className="text-center text-sm text-gray-600">
              <div>© {new Date().getFullYear()} Noyes AI. All rights reserved.</div>
              <div className="mt-1">
                Want help adding AI tools to your classroom?{' '}
                <a 
                  href="mailto:ben@noyesai.com" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Contact us
                </a>
              </div>
            </div>

            {/* Right side - logo */}
            <div className="w-[150px]">
              <Link 
                href="https://noyesai.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="block relative w-[150px] h-[45px] hover:opacity-90 transition-opacity"
              >
                <Image
                  src="/logo.PNG"
                  alt="Noyes AI Logo"
                  fill
                  className="object-contain"
                  priority
                  quality={100}
                  sizes="150px"
                />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
