/*
  Warnings:

  - You are about to drop the column `used_at` on the `invitations` table. All the data in the column will be lost.
  - You are about to drop the column `used_by_user_id` on the `invitations` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_used_by_user_id_fkey";

-- AlterTable
ALTER TABLE "invitations" DROP COLUMN "used_at",
DROP COLUMN "used_by_user_id",
ADD COLUMN     "use_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "invitation_id" TEXT;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
