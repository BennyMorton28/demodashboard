"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DemoMarkdownDisplay from "@/components/demo-markdown-display";
import JjSmithAssistant from "@/components/jj-smith-assistant";
import DemoLayout from "@/components/demo-layout";

export default function JjSmithDemo() {
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
      title="jj"
      leftContent={<JjSmithAssistant />}
      rightContent={<DemoMarkdownDisplay demoId="jj-smith" />}
    />
  );
}