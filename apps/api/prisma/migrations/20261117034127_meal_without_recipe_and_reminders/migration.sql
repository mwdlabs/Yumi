-- DropForeignKey
ALTER TABLE "meals" DROP CONSTRAINT "meals_recipe_id_fkey";

-- AlterTable
ALTER TABLE "meals" ALTER COLUMN "recipe_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "weeks" ADD COLUMN     "cook_reminder_sent_at" TIMESTAMPTZ(3),
ADD COLUMN     "list_ready_notified_at" TIMESTAMPTZ(3);

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
