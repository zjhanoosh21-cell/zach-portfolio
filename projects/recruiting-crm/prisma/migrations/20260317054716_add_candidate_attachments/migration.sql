-- CreateTable
CREATE TABLE "candidate_attachments" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_attachments_candidateId_idx" ON "candidate_attachments"("candidateId");

-- AddForeignKey
ALTER TABLE "candidate_attachments" ADD CONSTRAINT "candidate_attachments_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
