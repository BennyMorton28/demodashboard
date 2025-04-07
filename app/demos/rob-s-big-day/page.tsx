"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DemoMarkdownDisplay from "@/components/demo-markdown-display";
import MultiAssistantDemoLayout from "@/components/multi-assistant-demo-layout";
import MultiAssistantChat from "@/components/multi-assistant-chat";

// Define the Assistant type
interface Assistant {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isLocked: boolean;
  password?: string;
}

export default function RobSBigDayDemo() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [activeAssistant, setActiveAssistant] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Fetch assistants configuration
  useEffect(() => {
    if (status === "authenticated") {
      fetchAssistants();
    }
  }, [status]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);
  
  const fetchAssistants = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/multi-assistants?demoId=rob-s-big-day`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch assistants configuration");
      }
      
      const data = await response.json();
      
      if (data.assistants && data.assistants.length > 0) {
        setAssistants(data.assistants);
        // Set first unlocked assistant as active
        const firstUnlocked = data.assistants.find(a => !a.isLocked);
        if (firstUnlocked) {
          setActiveAssistant(firstUnlocked.id);
        } else {
          setActiveAssistant(data.assistants[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching assistants:", err);
      setError("Failed to load assistants");
    } finally {
      setLoading(false);
    }
  };
  
  // Handler for changing active assistant
  const handleAssistantChange = (assistantId: string) => {
    setActiveAssistant(assistantId);
  };
  
  // Handler for unlocking assistant
  const handleUnlockAssistant = async (assistantId: string, password: string): Promise<boolean> => {
    const assistant = assistants.find(a => a.id === assistantId);
    
    if (!assistant) return false;
    
    // Check if password matches
    const passwordMatches = assistant.password === password;
    
    if (passwordMatches) {
      // Update the assistant to be unlocked
      setAssistants(prev => 
        prev.map((a: Assistant) => 
          a.id === assistantId 
            ? { ...a, isLocked: false } 
            : a
        )
      );
    }
    
    return passwordMatches;
  };
  
  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Find the currently active assistant to get its name
  const currentAssistant = assistants.find(a => a.id === activeAssistant);
  const assistantName = currentAssistant?.name || "Assistant";

  return (
    <MultiAssistantDemoLayout
      title="Rob's Big Day"
      assistants={assistants}
      activeAssistant={activeAssistant}
      onAssistantChange={handleAssistantChange}
      onUnlockAssistant={handleUnlockAssistant}
      contentComponent={<DemoMarkdownDisplay demoId="rob-s-big-day" />}
      chatComponent={
        <MultiAssistantChat 
          demoId="rob-s-big-day" 
          assistantId={activeAssistant} 
          assistantName={assistantName} 
        />
      }
    />
  );
}