-- AlterTable
ALTER TABLE "shopping_items" ADD COLUMN     "added_by_id" TEXT,
ADD COLUMN     "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "shopping_items_week_id_created_at_idx" ON "shopping_items"("week_id", "created_at");

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
