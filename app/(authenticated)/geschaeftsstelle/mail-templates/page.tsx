import { prisma } from "@/lib/prisma";
import { MailTemplateForm } from "./MailTemplateForm";

export default async function MailTemplatesPage() {
  const templates = await prisma.mailTemplate.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      {templates.map((t) => (
        <MailTemplateForm key={t.key} templateKey={t.key} subject={t.subject} bodyText={t.bodyText} />
      ))}
    </div>
  );
}
