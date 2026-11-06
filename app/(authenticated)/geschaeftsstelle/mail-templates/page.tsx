import { prisma } from "@/lib/prisma";
import { ensureRescheduleTemplate } from "@/lib/mail/reschedule";
import { MailTemplateForm } from "./MailTemplateForm";

export default async function MailTemplatesPage() {
  await ensureRescheduleTemplate();
  const templates = await prisma.mailTemplate.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      {templates.map((t) => (
        <MailTemplateForm key={t.key} templateKey={t.key} subject={t.subject} bodyText={t.bodyText} />
      ))}
    </div>
  );
}
