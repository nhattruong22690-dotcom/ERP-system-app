ALTER TABLE "public"."landing_vips"
ADD COLUMN IF NOT EXISTS "phone_number" text,
ADD COLUMN IF NOT EXISTS "birth_date" date,
ADD COLUMN IF NOT EXISTS "card_value" numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS "branch" text,
ADD COLUMN IF NOT EXISTS "notes" text;
