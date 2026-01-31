CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" date DEFAULT now(),
	"updatedAt" date DEFAULT now()
);
