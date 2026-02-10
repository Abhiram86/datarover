CREATE TYPE "public"."insight_category" AS ENUM('metric', 'assumption', 'anomaly', 'user_goal', 'interpretation', 'other');--> statement-breakpoint
CREATE TABLE "agent_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"category" "insight_category" NOT NULL,
	"content" text NOT NULL,
	"source" text,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "isComplete" SET DEFAULT true;--> statement-breakpoint
CREATE INDEX "idx_agent_insights_category" ON "agent_insights" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_agent_insights_session" ON "agent_insights" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_agent_insights_tags" ON "agent_insights" USING btree ("tags");--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "toolCallId";