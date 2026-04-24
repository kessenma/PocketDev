ALTER TABLE "beta_signups" ADD COLUMN "job_responsibility" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "beta_signups" ADD COLUMN "job_responsibility_other" varchar(255);--> statement-breakpoint
ALTER TABLE "beta_signups" ADD COLUMN "use_type" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "beta_signups" ADD COLUMN "employer" varchar(255);