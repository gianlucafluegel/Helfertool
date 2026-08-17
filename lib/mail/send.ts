import { prisma } from "@/lib/prisma";
import { getTransporter } from "@/lib/mail/transporter";
import type { MailTemplateKey } from "@/generated/prisma/enums";

function renderTemplate(text: string, variables: Record<string, string>) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, token) => variables[token] ?? match);
}

export async function sendMail(
  key: MailTemplateKey,
  to: string,
  variables: Record<string, string>,
) {
  const template = await prisma.mailTemplate.findUnique({ where: { key } });
  if (!template) {
    console.error(`Mail template ${key} not found`);
    return;
  }

  const subject = renderTemplate(template.subject, variables);
  const text = renderTemplate(template.bodyText, variables);

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
    });
    await prisma.emailLog.create({
      data: { templateKey: key, toEmail: to, subject, status: "SENT" },
    });
  } catch (error) {
    console.error(`Failed to send mail (${key}) to ${to}:`, error);
    await prisma.emailLog.create({
      data: {
        templateKey: key,
        toEmail: to,
        subject,
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
