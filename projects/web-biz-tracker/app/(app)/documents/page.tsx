import { prisma } from "@/lib/prisma";
import { DocumentsHub } from "@/components/documents/documents-hub";

export default async function DocumentsPage() {
  const docs = await prisma.document.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  const serialized = docs.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return <DocumentsHub initialDocs={serialized} />;
}
