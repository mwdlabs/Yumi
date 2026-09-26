-- CreateEnum
CREATE TYPE "QuantitySource" AS ENUM ('MANUAL', 'RECIPES');

-- DropIndex
DROP INDEX "shopping_item_quantities_item_id_dimension_key";

-- AlterTable
ALTER TABLE "shopping_item_quantities" ADD COLUMN     "source" "QuantitySource" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE UNIQUE INDEX "shopping_item_quantities_item_id_source_dimension_key" ON "shopping_item_quantities"("item_id", "source", "dimension");

