"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import React from "react";

// Demo card data structure
interface DemoCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
}

// List of demo applications
const demoCards: DemoCard[] = [
  {
    id: "knowledge-assistant",
    title: "Knowledge Assistant",
    description: "An AI assistant that helps answer questions about the displayed content.",
    icon: "/icons/knowledge-assistant.svg",
    path: "/demos/knowledge-assistant"
  },
  {
    id: "bmsd-case-study",
    title: "BMSD Transportation Case Study",
    description: "Interactive case study with multiple characters exploring the transportation challenges at BMSD from different perspectives.",
    icon: "/icons/bmsd-case-study.svg",
    path: "https://bmsdcase.noyesai.com/"
  },
  {
    id: "kai",
    title: "Kai (Kellogg AI)",
    description: "An AI assistant specialized in helping Kellogg students with academic and career guidance.",
    icon: "/icons/kai.png",
    path: "/demos/kai"
  },
  {
    id: "streaming-api",
    title: "OpenAI Streaming API",
    description: "See how streaming responses work in real-time with the OpenAI API.",
    icon: "/icons/streaming-api.svg",
    path: "/demos/streaming-api"
  },
  // Add more demo cards here as you create them
  {
    id: "coming-soon-1",
    title: "Document Chat (Coming Soon)",
    description: "Chat with your uploaded documents using AI assistance.",
    icon: "/icons/document-chat.svg",
    path: "#"
  },
  {
    id: "coming-soon-2",
    title: "Tutor Bot (Coming Soon)",
    description: "AI tutor that helps with learning and educational tasks.",
    icon: "/icons/tutor-bot.svg",
    path: "#"
  }
];

export default function Dashboard() {
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 bg-white">
        <div className="container mx-auto h-full px-6">
          <div className="flex items-center justify-center h-full">
            <h1 className="text-2xl font-bold text-gray-900">AI Demo Dashboard</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome section */}
          <section className="mb-10">
            <h2 className="text-xl font-medium text-gray-800 mb-4">Welcome to our AI Demos</h2>
            <p className="text-gray-600">
              Explore our collection of AI assistants and demo applications. Each demo showcases different capabilities 
              and use cases. Click on any card to explore that demo.
            </p>
          </section>

          {/* Demo cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {demoCards.map((demo) => (
              <Link 
                key={demo.id} 
                href={demo.path}
                className={`block transition duration-200 
                  ${demo.path === "#" 
                    ? "opacity-70 cursor-not-allowed" 
                    : "hover:shadow-lg transform hover:-translate-y-1"
                  }`}
                onClick={(e) => demo.path === "#" && e.preventDefault()}
                target={demo.path.startsWith("http") ? "_blank" : undefined}
                rel={demo.path.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                <div className="bg-white rounded-lg shadow overflow-hidden h-full">
                  <div className="p-6 flex flex-col h-full">
                    <div className="flex items-center mb-4">
                      <div className="bg-gray-100 rounded-lg p-3 mr-4">
                        {/* Use actual image for Kai, SVG icons for others */}
                        {demo.id === "kai" ? (
                          <Image 
                            src={demo.icon}
                            alt={`${demo.title} icon`}
                            width={24}
                            height={24}
                          />
                        ) : (
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="24" 
                            height="24" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className="text-gray-700"
                          >
                            {demo.id.includes("knowledge") && (
                              <>
                                <circle cx="12" cy="12" r="10" />
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                <path d="M12 17h.01" />
                              </>
                            )}
                            {demo.id.includes("bmsd-case-study") && (
                              <>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </>
                            )}
                            {demo.id.includes("document") && (
                              <>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                              </>
                            )}
                            {demo.id.includes("tutor") && (
                              <>
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                              </>
                            )}
                          </svg>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{demo.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm flex-grow">{demo.description}</p>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                      <span className={`text-sm font-medium ${demo.path === "#" ? "text-gray-400" : "text-blue-600"}`}>
                        {demo.path === "#" ? "Coming Soon" : "Explore Demo →"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-auto min-h-12 border-t border-gray-200 bg-white relative z-50 py-3">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-sm text-gray-600 mb-2 md:mb-0">
              © 2025 Noyes AI. All rights reserved.
            </div>
            <div className="text-sm text-gray-600">
              Want help adding AI tools to your classroom? 
              <a href="mailto:ben@noyesai.com" className="text-blue-600 hover:underline ml-1">Contact us</a>
            </div>
            <div className="mt-2 md:mt-0">
              <Image 
                src="/logo.PNG" 
                alt="Noyes AI Logo" 
                width={120} 
                height={24} 
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
