-- AlterTable
ALTER TABLE "shopping_items" ADD COLUMN     "staple_id" TEXT;

-- AlterTable
ALTER TABLE "weeks" ADD COLUMN     "staples_applied_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "family_staples" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(10,3),
    "unit" "Unit",
    "created_by_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_staples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "family_staples_family_id_key_key" ON "family_staples"("family_id", "key");

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_staple_id_fkey" FOREIGN KEY ("staple_id") REFERENCES "family_staples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_staples" ADD CONSTRAINT "family_staples_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_staples" ADD CONSTRAINT "family_staples_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
