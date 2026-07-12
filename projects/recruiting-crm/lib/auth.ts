import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.isActive) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          isManager: user.isManager,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours — standard business day session
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin ?? false;
        token.isManager = user.isManager ?? false;
        token.activeCheckedAt = Date.now();
      }
      // Periodically verify the user is still active (every 5 min).
      // Note: isAdmin/isManager role changes take up to 8h to propagate —
      // acceptable for a small team. Ask the affected user to log out/in to
      // pick up role changes immediately.
      const CHECK_INTERVAL_MS = 5 * 60 * 1000;
      const lastCheck = token.activeCheckedAt as number | undefined;
      if (!user && token.id && (!lastCheck || Date.now() - lastCheck > CHECK_INTERVAL_MS)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isActive: true },
        });
        if (!dbUser?.isActive) return {} as typeof token; // force re-auth
        token.activeCheckedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin;
        session.user.isManager = token.isManager;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      // Follow next-auth's default naming (__Secure- prefix on https) so the
      // ~70 default getToken() calls in proxy.ts and app/api/** resolve the
      // same cookie name; pinning a custom name breaks them all on https.
      name: `${
        process.env.NEXTAUTH_URL?.startsWith("https://") ? "__Secure-" : ""
      }next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};
