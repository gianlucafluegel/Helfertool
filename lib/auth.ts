import NextAuth, { type Session, type User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type { SessionMember } from "@/types/next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { memberLinks: { include: { member: true } } },
        });

        if (!user || !user.isActive || !user.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          members: user.memberLinks.map((link) => ({
            id: link.member.id,
            firstName: link.member.firstName,
            lastName: link.member.lastName,
            isPrimary: link.isPrimary,
          })),
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }: { token: JWT; user?: User }) => {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.members = user.members;
      }
      return token;
    },
    session: ({ session, token }: { session: Session; token: JWT }) => {
      if (token.uid) session.user.id = token.uid;
      if (token.role) session.user.role = token.role;
      if (token.members) session.user.members = token.members;
      return session;
    },
  },
});
