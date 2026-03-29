import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

const allowedEmails = process.env.ALLOWED_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) || [];
const allowedDomains = process.env.ALLOWED_DOMAINS?.split(",").map((domain) => domain.trim().toLowerCase()) || [];

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user?.email?.toLowerCase();
      if (!email) return false;
      if (allowedEmails.length === 0 && allowedDomains.length === 0) {
        return true;
      }
      if (allowedEmails.includes(email)) {
        return true;
      }
      const domain = email.split("@")[1];
      if (domain && allowedDomains.includes(domain)) {
        return true;
      }
      return false;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
