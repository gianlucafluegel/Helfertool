import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { AuthTokenPurpose } from "@/generated/prisma/enums";

const EXPIRY_HOURS: Record<AuthTokenPurpose, number> = {
  ACCOUNT_SETUP: 48,
  PASSWORD_RESET: 2,
};

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function createAuthToken(userId: string, purpose: AuthTokenPurpose) {
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS[purpose] * 60 * 60 * 1000);

  await prisma.authToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });

  return rawToken;
}

export async function consumeAuthToken(rawToken: string, purpose: AuthTokenPurpose) {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.authToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !token ||
    token.purpose !== purpose ||
    token.usedAt ||
    token.expiresAt.getTime() < Date.now()
  ) {
    return null;
  }

  await prisma.authToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });

  return token.user;
}
