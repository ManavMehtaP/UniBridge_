// Parse the L.J. SY class-timetable spreadsheet (.xlsx) into flat timetable rows.
//
// An .xlsx is a ZIP of XML parts. We read it with Node's built-in zlib only — no
// `xlsx`/SheetJS dependency — so it runs anywhere (incl. Render) with nothing to
// install. We inflate just the worksheet + shared-strings parts and turn them into
// a cell grid, then walk the LJ layout:
//   row "DIVISION" → batch columns (C1, C2, …), each batch = 3 cols (Subject, Faculty, Room)
//   data rows      → col A = DAY (carried down), col B = LECTURE NO (skip "BREAK"),
//                    col C = TIME "8:45am to 9:45am", then Subject/Faculty/Room per batch.
import { inflateRawSync } from "node:zlib";

export interface TimetableRecord { batch: string; day: string; start: string; end: string; subject: string; room: string | null; mentorCode: string | null }
export interface TimetableParseResult { records: TimetableRecord[]; errors: string[] }

type Cell = string | number | null;

// ── minimal ZIP reader (central directory → inflate the entries we need) ──
function readZip(buf: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) throw new Error("not a zip/xlsx");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);
    try { files.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw)); } catch { /* skip unreadable entry */ }
    off += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    let s = "";
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let t: RegExpExecArray | null;
    while ((t = tRe.exec(m[1]))) s += decodeXml(t[1]);
    out.push(s);
  }
  return out;
}

function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSheet(xml: string, shared: string[]): Cell[][] {
  const grid: Cell[][] = [];
  const rowRe = /<row\b[^>]*?\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(xml))) {
    const rowIdx = Number(rm[1]) - 1;
    const cells: Cell[] = [];
    const cRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm: RegExpExecArray | null;
    while ((cm = cRe.exec(rm[2]))) {
      const attrs = cm[1] ?? "";
      const body = cm[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      if (!ref) continue;
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const v = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
      const inline = body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)?.[1];
      let val: Cell = null;
      if (type === "s") val = v != null ? (shared[Number(v)] ?? null) : null;
      else if (type === "str") val = v != null ? decodeXml(v) : null;
      else if (inline != null) val = decodeXml(inline);
      else if (v != null) { const num = Number(v); val = Number.isNaN(num) ? decodeXml(v) : num; }
      cells[colIndex(ref)] = val;
    }
    grid[rowIdx] = cells;
  }
  return grid;
}

const str = (v: Cell): string => (v == null ? "" : String(v)).trim();
const DAY_SET = new Set(["MON", "TUE", "WED", "THU", "FRI", "SAT"]);

// "8:45am to 9:45am" halves → 24h "HH:MM"
function to24(raw: string): string | null {
  const m = raw.trim().toLowerCase().replace(/\s+/g, "").replace(/\./g, "").match(/^(\d{1,2}):(\d{2})(am|pm)$/);
  if (!m) return null;
  let h = Number(m[1]);
  if (m[3] === "pm" && h !== 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

export function parseTimetableExcel(buffer: Buffer): TimetableParseResult {
  const errors: string[] = [];
  let files: Map<string, Buffer>;
  try { files = readZip(buffer); } catch { return { records: [], errors: ["Could not read the file — please upload a valid .xlsx timetable."] }; }

  const sheetKey = [...files.keys()].find((k) => /^xl\/worksheets\/sheet1\.xml$/i.test(k)) ?? [...files.keys()].find((k) => /^xl\/worksheets\/.*\.xml$/i.test(k));
  if (!sheetKey) return { records: [], errors: ["The Excel file has no worksheet."] };
  const sharedBuf = [...files.entries()].find(([k]) => /sharedStrings\.xml$/i.test(k))?.[1];
  const shared = sharedBuf ? parseSharedStrings(sharedBuf.toString("utf8")) : [];
  const grid = parseSheet(files.get(sheetKey)!.toString("utf8"), shared);

  // Locate the DIVISION header row and its batch columns.
  const divRow = grid.findIndex((row) => row && str(row[0]).toUpperCase() === "DIVISION");
  if (divRow < 0) return { records: [], errors: ["Couldn't find the DIVISION row — use the standard LJ timetable format."] };
  const blocks: { subCol: number; batch: string }[] = [];
  const divCells = grid[divRow] ?? [];
  for (let c = 3; c < divCells.length; c++) { const v = str(divCells[c]); if (v) blocks.push({ subCol: c, batch: v.toUpperCase() }); }
  if (blocks.length === 0) return { records: [], errors: ["No batch columns (C1, C2, …) found in the DIVISION row."] };

  const records: TimetableRecord[] = [];
  let currentDay = "";
  for (let r = divRow + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;
    const dayCell = str(row[0]).toUpperCase();
    if (DAY_SET.has(dayCell)) currentDay = dayCell;
    const lecture = str(row[1]).toUpperCase();
    if (!lecture || lecture === "LECTURE NO" || lecture === "BREAK") continue;
    if (!currentDay) continue;
    const timeCell = str(row[2]);
    if (!timeCell) continue;
    const [s, e] = timeCell.split(/\s*to\s*/i);
    const start = to24(s ?? ""), end = to24(e ?? "");
    if (!start || !end) { errors.push(`${currentDay} L${lecture}: unreadable time "${timeCell}" — skipped.`); continue; }
    for (const b of blocks) {
      const subject = str(row[b.subCol]);
      if (!subject) continue; // no lecture for this batch in this slot
      records.push({ batch: b.batch, day: currentDay, start, end, subject, room: str(row[b.subCol + 1 + 1]) || null, mentorCode: str(row[b.subCol + 1]) || null });
    }
  }
  if (records.length === 0) errors.push("No lecture rows were found in the file.");
  return { records, errors };
}
