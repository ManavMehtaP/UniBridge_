import prisma from "./prisma.js";

// Single-university deployment: the one University row in the DB.
// Resolved once and cached — no subdomains, no tenant lookup per request.
let cachedId: string | null = null;

export async function universityId(): Promise<string> {
  if (cachedId) return cachedId;
  const u = await prisma.university.findFirst({ select: { id: true } });
  if (!u) throw new Error("No university row exists in the database. Seed one first.");
  cachedId = u.id;
  return cachedId;
}
