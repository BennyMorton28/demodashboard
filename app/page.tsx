"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import React from "react";
import AddDemoButton from "@/components/add-demo-button";
import EditDemoButton from "@/components/edit-demo-button";
import DemoCard from "@/components/demo-card";
import { Toaster } from "react-hot-toast";

// Demo card data structure
interface DemoCardData {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
}

// Helper function to get initials
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// List of hardcoded demo applications
const hardcodedDemoCards: DemoCardData[] = [
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
  }
];

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [demoCards, setDemoCards] = useState<DemoCardData[]>(hardcodedDemoCards);
  const [loading, setLoading] = useState(true);

  // Function to fetch dynamic demos
  const fetchDemos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/get-demos');
      const data = await response.json();
      const dynamicDemos = data.demos.filter(
        (demo: any) => !hardcodedDemoCards.some(card => card.id === demo.id)
      ).map((demo: any) => ({
        id: demo.id,
        title: demo.title,
        description: demo.description,
        icon: `/icons/${demo.id}${demo.iconExt || '.png'}`, // Use the icon extension from the API
        path: `/demos/${demo.id}`
      }));
      
      setDemoCards([...hardcodedDemoCards, ...dynamicDemos]);
    } catch (error) {
      console.error('Error fetching demos:', error);
      setDemoCards(hardcodedDemoCards);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dynamically created demos and add them to the list
  useEffect(() => {
    fetchDemos();
  }, [fetchDemos]);

  useEffect(() => {
    console.log("Auth status:", status, "Session:", session ? "exists" : "none");
    if (status === "unauthenticated") {
      console.log("User is not authenticated, redirecting to signin page");
      router.push("/auth/signin");
    }
  }, [status, router, session]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    console.log("No session found, returning null");
    return null;
  }

  // In the onError handler, we can simplify since we now use the correct extension
  const onImageError = (e: any, demo: DemoCardData) => {
    const imgElement = e.target as HTMLImageElement;
    
    // Replace with initials if the image fails to load
    const targetDiv = imgElement.parentElement;
    if (targetDiv) {
      const initialsDiv = document.createElement('div');
      initialsDiv.className = "text-gray-700 text-lg font-bold";
      initialsDiv.textContent = getInitials(demo.title);
      targetDiv.innerHTML = '';
      targetDiv.appendChild(initialsDiv);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Toast notifications */}
      <Toaster position="top-right" />
      
      {/* Add Demo Button */}
      <AddDemoButton onDemoAdded={fetchDemos} />
      
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
              <DemoCard
                key={demo.id}
                id={demo.id}
                title={demo.title}
                description={demo.description}
                icon={demo.icon}
                path={demo.path}
                onImageError={onImageError}
                showEdit={!demo.path.startsWith('http') && 
                          demo.path !== "#" && 
                          !hardcodedDemoCards.some(card => card.id === demo.id)}
                EditComponent={EditDemoButton}
                onUpdate={fetchDemos}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-auto min-h-8 border-t border-gray-200 bg-white relative z-50 py-2">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-xs text-gray-600 mb-1 md:mb-0">
              © 2025 Noyes AI. All rights reserved.
            </div>
            <div className="text-xs text-gray-600">
              Want help adding AI tools to your classroom? 
              <a href="mailto:ben@noyesai.com" className="text-blue-600 hover:underline ml-1">Contact us</a>
            </div>
            <div className="mt-1 md:mt-0">
              <Image 
                src="/logo.PNG" 
                alt="Noyes AI Logo" 
                width={60} 
                height={12} 
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
