-- CreateTable
CREATE TABLE "user_notepads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pages" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notepads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_notepads_userId_key" ON "user_notepads"("userId");

-- AddForeignKey
ALTER TABLE "user_notepads" ADD CONSTRAINT "user_notepads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
