import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        captchaToken: { label: "CAPTCHA Token", type: "text" },
      },
      async authorize(credentials) {
        try {
          console.log("Authorize method called with credentials:", credentials ? "provided" : "missing");
          
          if (!credentials?.captchaToken) {
            console.log("No captchaToken provided, rejecting");
            throw new Error("CAPTCHA verification required");
          }

          console.log("Verifying captchaToken with Google reCAPTCHA API");
          const recaptchaResponse = await fetch(
            "https://www.google.com/recaptcha/api/siteverify",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${credentials.captchaToken}`,
            }
          );

          const recaptchaData = await recaptchaResponse.json();
          console.log("reCAPTCHA response:", recaptchaData.success ? "success" : "failed");

          if (!recaptchaData.success) {
            console.error("reCAPTCHA verification failed:", recaptchaData);
            throw new Error("CAPTCHA verification failed");
          }

          console.log("reCAPTCHA verification successful, creating user session");
          return {
            id: "1",
            name: "Verified User",
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days (in seconds)
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async jwt({ token }) {
      console.log("JWT callback called with token:", token ? "exists" : "missing");
      return token;
    },
    async session({ session, token }) {
      console.log("Session callback called:", session ? "session exists" : "no session");
      return session;
    }
  },
});

export { handler as GET, handler as POST }; 