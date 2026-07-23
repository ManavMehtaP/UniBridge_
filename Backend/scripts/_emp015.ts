import prisma from "../src/config/prisma.js"
const f = await prisma.faculty.findFirst({ where: { employeeId: { equals: "emp015", mode: "insensitive" } }, select: { id: true, employeeId: true, name: true, year: true, isHod: true, universityId: true } })
console.log("FACULTY emp015:", JSON.stringify(f, null, 2))
if (f) {
  const asg = await prisma.facultyBatchAssignment.findMany({ where: { facultyId: f.id }, include: { batch: { select: { code: true, yearLevel: true } }, subject: { select: { code: true, name: true } }, semester: { select: { label: true, number: true } } } })
  console.log("ASSIGNMENTS:", JSON.stringify(asg.map(a => ({ batch: a.batch.code, yl: a.batch.yearLevel, subj: a.subject.code, sem: a.semester?.label })), null, 2))
}
// SY batches (C1-C9?) and sem-4 context
const batches = await prisma.batch.findMany({ where: { yearLevel: "SY" }, select: { code: true, id: true }, orderBy: { code: "asc" } })
console.log("SY BATCHES:", batches.map(b => b.code).join(", "))
const sems = await prisma.semester.findMany({ where: { yearLevel: "SY" }, select: { number: true, label: true, status: true }, orderBy: { number: "asc" } })
console.log("SY SEMS:", JSON.stringify(sems))
await prisma.$disconnect()
