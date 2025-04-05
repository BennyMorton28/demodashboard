"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Assistant from "@/components/assistant";
import DemoMarkdownDisplay from "@/components/demo-markdown-display";
import DemoLayout from "@/components/demo-layout";

export default function KnowledgeAssistantDemo() {
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
    <DemoLayout
      title="Knowledge Assistant"
      leftContent={<Assistant />}
      rightContent={<DemoMarkdownDisplay demoId="knowledge-assistant" />}
    />
  );
} 