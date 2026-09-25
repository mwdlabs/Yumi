-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('MEAL_CHOICE');

-- CreateEnum
CREATE TYPE "ReminderFrequency" AS ENUM ('WEEKLY');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "WeekStatus" AS ENUM ('OPEN', 'LIST_GENERATED', 'SHOPPING_DONE');

-- CreateEnum
CREATE TYPE "ListTrigger" AS ENUM ('ALL_CHOSEN', 'DEADLINE', 'MANUAL');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('PENDING', 'CHOSEN', 'ABSENT');

-- CreateEnum
CREATE TYPE "ItemChange" AS ENUM ('NEW', 'INCREASED', 'NO_LONGER_NEEDED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('IOS', 'ANDROID');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('G', 'KG', 'ML', 'L', 'TSP', 'TBSP', 'CUP', 'UNIT', 'PINCH', 'CLOVE', 'CAN', 'PACK', 'SLICE', 'BUNCH');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_otps" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "device_label" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "last_used_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "locale" TEXT NOT NULL DEFAULT 'fr-CA',
    "week_starts_on" INTEGER NOT NULL DEFAULT 1,
    "deadline_weekday" INTEGER NOT NULL,
    "deadline_time" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "used_at" TIMESTAMPTZ(3),
    "used_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_color" TEXT NOT NULL,
    "avatar_emoji" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "is_shopping_responsible" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_pairing_codes" (
    "id" TEXT NOT NULL,
    "target_member_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_pairing_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_schedules" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL DEFAULT 'MEAL_CHOICE',
    "frequency" "ReminderFrequency" NOT NULL DEFAULT 'WEEKLY',
    "weekday" INTEGER NOT NULL,
    "local_time" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "next_run_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notification_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_dispatches" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "occurrence_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMPTZ(3),
    "error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "servings" INTEGER,
    "created_by_id" TEXT NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(10,3),
    "unit" "Unit",

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weeks" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "deadline_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "WeekStatus" NOT NULL DEFAULT 'OPEN',
    "list_trigger" "ListTrigger",
    "list_generated_at" TIMESTAMPTZ(3),
    "list_version" INTEGER NOT NULL DEFAULT 0,
    "shopping_done_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "week_participations" (
    "id" TEXT NOT NULL,
    "week_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'PENDING',
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "week_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" TEXT NOT NULL,
    "week_id" TEXT NOT NULL,
    "cook_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_items" (
    "id" TEXT NOT NULL,
    "week_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "checked_at" TIMESTAMPTZ(3),
    "checked_by_id" TEXT,
    "change" "ItemChange",

    CONSTRAINT "shopping_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_item_quantities" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "unit" "Unit",
    "amount" DECIMAL(12,3),
    "purchased_amount" DECIMAL(12,3),

    CONSTRAINT "shopping_item_quantities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_item_sources" (
    "item_id" TEXT NOT NULL,
    "meal_id" TEXT NOT NULL,
    "recipe_ingredient_id" TEXT NOT NULL,

    CONSTRAINT "shopping_item_sources_pkey" PRIMARY KEY ("item_id","meal_id","recipe_ingredient_id")
);

-- CreateTable
CREATE TABLE "push_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "email_otps_email_created_at_idx" ON "email_otps"("email", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "invitations_code_hash_idx" ON "invitations"("code_hash");

-- CreateIndex
CREATE INDEX "invitations_family_id_idx" ON "invitations"("family_id");

-- CreateIndex
CREATE INDEX "members_user_id_idx" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_family_id_user_id_key" ON "members"("family_id", "user_id");

-- CreateIndex
CREATE INDEX "device_pairing_codes_code_hash_idx" ON "device_pairing_codes"("code_hash");

-- CreateIndex
CREATE INDEX "notification_schedules_active_next_run_at_idx" ON "notification_schedules"("active", "next_run_at");

-- CreateIndex
CREATE INDEX "notification_schedules_member_id_idx" ON "notification_schedules"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_dispatches_schedule_id_occurrence_at_key" ON "reminder_dispatches"("schedule_id", "occurrence_at");

-- CreateIndex
CREATE INDEX "recipes_family_id_name_idx" ON "recipes"("family_id", "name");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE INDEX "weeks_status_deadline_at_idx" ON "weeks"("status", "deadline_at");

-- CreateIndex
CREATE UNIQUE INDEX "weeks_family_id_start_date_key" ON "weeks"("family_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "week_participations_week_id_member_id_key" ON "week_participations"("week_id", "member_id");

-- CreateIndex
CREATE INDEX "meals_cook_id_idx" ON "meals"("cook_id");

-- CreateIndex
CREATE UNIQUE INDEX "meals_week_id_date_key" ON "meals"("week_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_items_week_id_key_key" ON "shopping_items"("week_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_item_quantities_item_id_dimension_key" ON "shopping_item_quantities"("item_id", "dimension");

-- CreateIndex
CREATE UNIQUE INDEX "push_devices_token_key" ON "push_devices"("token");

-- CreateIndex
CREATE INDEX "push_devices_user_id_idx" ON "push_devices"("user_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_pairing_codes" ADD CONSTRAINT "device_pairing_codes_target_member_id_fkey" FOREIGN KEY ("target_member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_pairing_codes" ADD CONSTRAINT "device_pairing_codes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_dispatches" ADD CONSTRAINT "reminder_dispatches_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "notification_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_participations" ADD CONSTRAINT "week_participations_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_participations" ADD CONSTRAINT "week_participations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_cook_id_fkey" FOREIGN KEY ("cook_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_checked_by_id_fkey" FOREIGN KEY ("checked_by_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_item_quantities" ADD CONSTRAINT "shopping_item_quantities_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "shopping_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_item_sources" ADD CONSTRAINT "shopping_item_sources_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "shopping_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_item_sources" ADD CONSTRAINT "shopping_item_sources_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_item_sources" ADD CONSTRAINT "shopping_item_sources_recipe_ingredient_id_fkey" FOREIGN KEY ("recipe_ingredient_id") REFERENCES "recipe_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
