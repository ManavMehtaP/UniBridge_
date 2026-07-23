import prisma from "./prisma.js";

// Single-university deployment: the one University row in the DB.
// Resolved once and cached — no subdomains, no tenant lookup per request.
let cachedId: string | null = null;

export async function universityId(): Promise<string> {
  // The database may be reset/reseeded while the API process stays alive.
  // Validate the cached row before reusing it; otherwise requests keep using
  // a deleted UUID and foreign-key writes fail with a misleading Prisma error.
  if (cachedId) {
    const stillExists = await prisma.university.findUnique({ where: { id: cachedId }, select: { id: true } });
    if (stillExists) return cachedId;
    cachedId = null;
  }
  const u = await prisma.university.findFirst({ select: { id: true } });
  if (!u) throw new Error("No university row exists in the database. Seed one first.");
  cachedId = u.id;
  return cachedId;
}

export function clearUniversityIdCache() {
  cachedId = null;
}
