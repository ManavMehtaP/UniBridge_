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
  // Public base URL of the object-storage bucket. Credentials stay in the
  // deployment provider; this value is safe to commit and is persisted with
  // each note as fileUrl/fileKey metadata.
  STORAGE_BUCKET_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
