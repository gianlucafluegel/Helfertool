import type { UserRole } from "@/generated/prisma/enums";

export type SessionMember = {
  id: string;
  firstName: string;
  lastName: string;
};

declare module "next-auth" {
  interface User {
    role: UserRole;
    member: SessionMember | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      member: SessionMember | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    member?: SessionMember | null;
    uid?: string;
  }
}
