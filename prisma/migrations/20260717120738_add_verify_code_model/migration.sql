-- CreateTable
CREATE TABLE "verify_code" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verify_code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verify_code_user_id_idx" ON "verify_code"("user_id");

-- CreateIndex
CREATE INDEX "verify_code_code_idx" ON "verify_code"("code");

-- CreateIndex
CREATE INDEX "verify_code_expires_at_idx" ON "verify_code"("expires_at");

-- AddForeignKey
ALTER TABLE "verify_code" ADD CONSTRAINT "verify_code_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
