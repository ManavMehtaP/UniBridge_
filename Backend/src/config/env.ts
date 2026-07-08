import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
