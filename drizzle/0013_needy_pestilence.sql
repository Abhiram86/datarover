DROP INDEX "idx_agent_insights_category";--> statement-breakpoint
DROP INDEX "idx_agent_insights_session";--> statement-breakpoint
DROP INDEX "idx_agent_insights_tags";--> statement-breakpoint
ALTER TABLE "agent_insights" ALTER COLUMN "content" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "agent_insights" ALTER COLUMN "content" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_insights" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "agent_insights" DROP COLUMN "source";--> statement-breakpoint
ALTER TABLE "agent_insights" DROP COLUMN "tags";--> statement-breakpoint
DROP TYPE "public"."insight_category";