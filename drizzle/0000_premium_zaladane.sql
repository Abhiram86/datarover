CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar NOT NULL,
	"createdAt" date DEFAULT now(),
	"updatedAt" date DEFAULT now(),
	"lastLogin" date DEFAULT now()
);
