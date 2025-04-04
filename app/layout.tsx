import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import AuthProvider from "@/components/providers/session-provider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Noyes Demo Dashboard",
  description: "Explore AI assistants and demo applications by Noyes AI",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" }
    ]
  }
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  
  // Add a server-side console log to track session state during server rendering
  console.log("[Server] Session state in RootLayout:", session ? "authenticated" : "no session");

  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <Toaster position="top-right" />
        <AuthProvider>
          <main className="h-full">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
