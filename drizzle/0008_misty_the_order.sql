ALTER TABLE "conversations" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "role" SET DATA TYPE "public"."role";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "role" SET DEFAULT 'user';