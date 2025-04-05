"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DemoMarkdownDisplay from "@/components/demo-markdown-display";
import PotatoJacksonAssistant from "@/components/potato-jackson-assistant";
import DemoLayout from "@/components/demo-layout";

export default function PotatoJacksonDemo() {
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
      title="Potato Jackson"
      leftContent={<PotatoJacksonAssistant />}
      rightContent={<DemoMarkdownDisplay demoId="potato-jackson" />}
    />
  );
}