CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspaceId" uuid NOT NULL,
	"title" varchar(255),
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversationId" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"isComplete" boolean DEFAULT true,
	"promptTokens" integer,
	"completionTokens" integer,
	"createdAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "createdAt" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "lastLogin" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "lastLogin" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "userId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "createdAt" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspaceId_workspaces_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;