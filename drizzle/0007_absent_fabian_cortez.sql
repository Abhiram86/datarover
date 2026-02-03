ALTER TABLE "messages" ALTER COLUMN "reasoning" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "promptTokens" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "completionTokens" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");