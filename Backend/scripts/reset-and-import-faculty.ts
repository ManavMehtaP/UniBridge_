/**
 * Destructive production-style bootstrap for a single university.
 *
 * Run only with RESET_CONFIRM=YES. It truncates the university root with
 * PostgreSQL CASCADE, then creates one LJU Dean account and imports faculty.
 */
import fs from "node:fs";
import path from "node:path";
import prisma from "../src/config/prisma.js";

const CSV_PATH = process.argv[2] ?? "/Users/thakarkavy/Downloads/faculty_with_mentor_codes.csv";
const UNIVERSITY_NAME = "lju";
const UNIVERSITY_SLUG = "lju";
const DEAN_EMAIL = "dean@lju.edu.in";
const DEAN_PASSWORD = "dean@123";

type FacultyRow = { employeeId: string; name: string; year: string; mentorCode: string };

function parseCsv(filePath: string): FacultyRow[] {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error(`CSV is empty: ${filePath}`);
  const header = lines.shift()!.split(",").map((v) => v.trim().toLowerCase());
  const required = ["employee_id", "name", "year", "mentor_code"];
  for (const column of required) if (!header.includes(column)) throw new Error(`CSV is missing column: ${column}`);
  const index = Object.fromEntries(required.map((column) => [column, header.indexOf(column)]));
  return lines.map((line, lineIndex) => {
    const values = line.split(",").map((value) => value.trim());
    const row = {
      employeeId: values[index.employee_id] ?? "",
      name: values[index.name] ?? "",
      year: values[index.year] ?? "",
      mentorCode: values[index.mentor_code] ?? "",
    };
    if (!row.employeeId || !row.name || !row.year || !row.mentorCode) throw new Error(`Invalid faculty row ${lineIndex + 2}`);
    return row;
  });
}

async function main() {
  if (process.env.RESET_CONFIRM !== "YES") {
    throw new Error("Refusing destructive reset. Set RESET_CONFIRM=YES to continue.");
  }
  const rows = parseCsv(path.resolve(CSV_PATH));
  const ids = new Set(rows.map((row) => row.employeeId));
  if (ids.size !== rows.length) throw new Error("CSV contains duplicate employee IDs.");

  console.log(`Resetting database and importing ${rows.length} faculty records...`);
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "universities" CASCADE;');

  const university = await prisma.university.create({
    data: { name: UNIVERSITY_NAME, slug: UNIVERSITY_SLUG, plan: "FREE", status: "ACTIVE" },
  });

  const dean = await prisma.faculty.create({
    data: {
      universityId: university.id,
      employeeId: "ADMIN001",
      name: "LJU University Admin",
      email: DEAN_EMAIL,
      passwordHash: DEAN_PASSWORD,
      isDean: true,
      isHod: false,
      isActive: true,
    },
  });

  for (const row of rows) {
    await prisma.faculty.create({
      data: {
        universityId: university.id,
        employeeId: row.employeeId,
        name: row.name,
        email: `${row.employeeId.toLowerCase()}@lju.edu.in`,
        passwordHash: `${row.employeeId}@123`,
        year: row.year,
        mentorCode: row.mentorCode,
        isDean: false,
        isHod: false,
        isActive: true,
      },
    });
  }

  console.log(JSON.stringify({
    university: { id: university.id, name: university.name, slug: university.slug },
    dean: { employeeId: dean.employeeId, email: dean.email },
    facultyImported: rows.length,
    facultyPasswordPattern: "<employeeId>@123",
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
