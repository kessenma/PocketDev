CREATE TABLE "push_device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relay_token_id" text NOT NULL,
	"apns_token" text NOT NULL,
	"environment" text NOT NULL,
	"registered_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "push_device_tokens_relay_token_id_apns_token_unique" UNIQUE("relay_token_id","apns_token")
);
--> statement-breakpoint
CREATE TABLE "push_notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relay_token_id" text,
	"apns_token" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"success" boolean NOT NULL,
	"gorush_response" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_relay_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_device_tokens" ADD CONSTRAINT "push_device_tokens_relay_token_id_push_relay_tokens_id_fk" FOREIGN KEY ("relay_token_id") REFERENCES "public"."push_relay_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notification_log" ADD CONSTRAINT "push_notification_log_relay_token_id_push_relay_tokens_id_fk" FOREIGN KEY ("relay_token_id") REFERENCES "public"."push_relay_tokens"("id") ON DELETE no action ON UPDATE no action;