'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.log("[Client] Auth provider mounted");
  }, []);

  return (
    <SessionProvider refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
} 