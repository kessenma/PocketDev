CREATE TABLE IF NOT EXISTS "installs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text,
	"script_version" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
