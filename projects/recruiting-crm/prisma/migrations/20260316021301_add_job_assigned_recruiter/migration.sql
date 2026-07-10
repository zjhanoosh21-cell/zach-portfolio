-- AlterTable
ALTER TABLE "job_orders" ADD COLUMN     "assignedToId" TEXT;

-- CreateIndex
CREATE INDEX "job_orders_assignedToId_idx" ON "job_orders"("assignedToId");

-- AddForeignKey
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
