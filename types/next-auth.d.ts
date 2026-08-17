import type { UserRole } from "@/generated/prisma/enums";

export type SessionMember = {
  id: string;
  firstName: string;
  lastName: string;
  isPrimary: boolean;
};

declare module "next-auth" {
  interface User {
    role: UserRole;
    members: SessionMember[];
  }
  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      members: SessionMember[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    members?: SessionMember[];
    uid?: string;
  }
}
