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
      {/* Header with logo */}
      <header className="h-24 border-b border-gray-200 relative z-50 bg-white">
        <div className="container mx-auto h-full px-6">
          <div className="flex items-center justify-start h-full">
            <Link 
              href="https://noyesai.com" 
              target="_blank"
              rel="noopener noreferrer"
              className="block relative w-[900px] h-[90px] hover:opacity-90 transition-opacity"
            >
              <Image
                src="/logo.PNG"
                alt="Noyes AI Logo"
                fill
                className="object-contain object-left"
                priority
                quality={100}
                sizes="900px"
              />
            </Link>
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
      <footer className="h-12 flex items-center justify-center border-t border-gray-200 bg-white relative z-50">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          © {new Date().getFullYear()} Noyes AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
