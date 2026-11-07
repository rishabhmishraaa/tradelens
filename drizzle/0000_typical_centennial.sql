CREATE TABLE "session_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_date" date NOT NULL,
	"review" jsonb NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_reviews_user_date_unique" UNIQUE("user_id","session_date")
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"side" text NOT NULL,
	"entry_price" numeric(20, 8) NOT NULL,
	"exit_price" numeric(20, 8) NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"fees" numeric(20, 8) DEFAULT '0' NOT NULL,
	"currency" varchar(3) NOT NULL,
	"entry_at" timestamp with time zone NOT NULL,
	"exit_at" timestamp with time zone NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trades_quantity_positive" CHECK ("trades"."quantity" > 0),
	CONSTRAINT "trades_entry_price_positive" CHECK ("trades"."entry_price" > 0),
	CONSTRAINT "trades_exit_price_positive" CHECK ("trades"."exit_price" > 0),
	CONSTRAINT "trades_fees_non_negative" CHECK ("trades"."fees" >= 0),
	CONSTRAINT "trades_exit_after_entry" CHECK ("trades"."exit_at" > "trades"."entry_at"),
	CONSTRAINT "trades_currency_iso" CHECK ("trades"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "trades_side_valid" CHECK ("trades"."side" IN ('long', 'short')),
	CONSTRAINT "trades_symbol_length" CHECK (char_length("trades"."symbol") BETWEEN 1 AND 20),
	CONSTRAINT "trades_notes_length" CHECK ("trades"."notes" IS NULL OR char_length("trades"."notes") <= 1000),
	CONSTRAINT "trades_tags_known" CHECK ("trades"."tags" <@ ARRAY['fomo-entry', 'chased-price', 'no-stop', 'moved-stop', 'oversized', 'early-exit', 'held-loser', 'revenge-trade', 'broke-plan', 'overtraded']::text[])
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_reviews" ADD CONSTRAINT "session_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trades_user_exit_idx" ON "trades" USING btree ("user_id","exit_at");