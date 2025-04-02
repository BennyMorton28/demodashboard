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
          if (!credentials?.captchaToken) {
            throw new Error("CAPTCHA verification required");
          }

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

          if (!recaptchaData.success) {
            console.error("reCAPTCHA verification failed:", recaptchaData);
            throw new Error("CAPTCHA verification failed");
          }

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
  },
});

export { handler as GET, handler as POST }; 