ALTER TABLE "messages" ALTER COLUMN "isComplete" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "promptTokens" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "completionTokens" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reasoning" text NOT NULL;