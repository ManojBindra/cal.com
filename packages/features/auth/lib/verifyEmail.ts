import { randomBytes } from "crypto";

import { sendEmailVerificationLink } from "@calcom/emails/email-manager";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { TokenType } from "@calcom/prisma/enums";

interface VerifyEmailType {
  username?: string;
  email: string;
  language?: string;
}

export const sendEmailVerifciation = async ({ email, language, username }: VerifyEmailType) => {
  const token: string = randomBytes(32).toString("hex");
  const translation = await getTranslation(language ?? "en", "common");

  const sendEmailVerifciationEnabled = await prisma.feature.findFirst({
    where: {
      slug: "email-verification",
      enabled: true,
    },
  });

  if (!sendEmailVerifciationEnabled) {
    console.log("Email verification is disabled - Skipping");
    return { ok: true, skipped: true };
  }

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      type: TokenType.VERIFY_ACCOUNT,
      expires: new Date(new Date().setHours(24)), // +1 day
    },
  });

  const params = new URLSearchParams({
    token,
  });

  await sendEmailVerificationLink({
    language: translation,
    verificationEmailLink: `${WEBAPP_URL}/api/auth/verify-email?${params.toString()}`,
    user: {
      email,
      name: username,
    },
  });

  return { ok: true, skipped: false };
};
