"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DemoMarkdownDisplay from "@/components/demo-markdown-display";
import MindayJawnsonAssistant from "@/components/minday-jawnson-assistant";
import DemoLayout from "@/components/demo-layout";

export default function MindayJawnsonDemo() {
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
      title="Minday Jawnson"
      leftContent={<MindayJawnsonAssistant />}
      rightContent={<DemoMarkdownDisplay demoId="minday-jawnson" />}
    />
  );
}