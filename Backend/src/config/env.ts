import dotenv from "dotenv";
import { z } from "zod";

// Precedence: real env vars > .env.production (committed, no secrets) > .env (local-only).
// dotenv never overrides already-set vars, so loading in this order gives that chain.
if (process.env.NODE_ENV === "production") dotenv.config({ path: ".env.production" });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().url(),
  // Supabase S3-compatible endpoint (…/storage/v1/s3) used for note uploads.
  STORAGE_BUCKET_URL: z.string().url().optional(),
  // S3 access keys for the endpoint above (Supabase Dashboard → Storage → S3 access keys).
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
});

export const env = envSchema.parse(process.env);
