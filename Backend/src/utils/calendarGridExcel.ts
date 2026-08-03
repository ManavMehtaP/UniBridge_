// Parse the L.J. "Academic Calendar" spreadsheet (.xlsx) — a month-grid where each
// column is a month and each cell is "<day-of-month>- <event label>", e.g.
// "15- Regular Teaching-1", "6-Test-1 (CCE): PS", "2- Navaratri Break".
// We turn it into calendar events + the four test phases (T1–T4) with their dates.
import { readXlsxGrid, type XlsxCell } from "./timetableExcel.js";

export type CalEventType = "REGULAR_TEACHING" | "HOLIDAY" | "PUBLIC_HOLIDAY" | "READING_HOLIDAY" | "SEMESTER_BREAK" | "EXAM" | "CULTURAL" | "ACTIVITY" | "PHASE" | "OTHER";
export interface CalEvent { title: string; date: Date; type: CalEventType }
export interface CalTest { phase: number; subject: string; date: Date }
export interface CalendarGridResult { events: CalEvent[]; tests: CalTest[]; errors: string[] }

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const str = (v: XlsxCell): string => (v == null ? "" : String(v)).trim();

function parseMonthHeader(raw: string): { year: number; month: number } | null {
  const m = raw.trim().match(/^([A-Za-z]{3,})[-\s.]*'?(\d{2,4})$/);
  if (!m) return null;
  const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  const yy = m[2];
  return { year: yy.length === 2 ? 2000 + Number(yy) : Number(yy), month };
}

// Classify an event label into a calendar type. Order matters (specific → generic).
function classify(label: string): CalEventType | null {
  const l = label.toLowerCase();
  if (/regular\s*teach(?:ing)?|teaching\s*day|\blectures?\b/.test(l)) return "REGULAR_TEACHING";
  if (/test-\s*[1-4]/.test(l)) return "EXAM";
  if (/ipe|project evaluation|viva|practical exam/.test(l)) return "EXAM";
  if (/reading holiday/.test(l)) return "READING_HOLIDAY";
  if (/diwali break|navaratri break|sem(ester)? break|vacation|winter break|summer break/.test(l)) return "SEMESTER_BREAK";
  if (/fest|cultural|annual day|sports/.test(l)) return "CULTURAL";
  if (/public holiday|republic day|independence|gandhi|christmas|makar sankranti|holi\b|eid|diwali|navratri|navaratri|uttarayan|dussehra|janmashtami|raksha|ganesh/.test(l)) return "PUBLIC_HOLIDAY";
  if (/\bholiday\b/.test(l)) return "HOLIDAY";
  return "OTHER";
}

export function parseAcademicCalendarExcel(buffer: Buffer): CalendarGridResult {
  const errors: string[] = [];
  let grid: XlsxCell[][];
  try { grid = readXlsxGrid(buffer); } catch { return { events: [], tests: [], errors: ["Could not read the file — please upload a valid .xlsx academic calendar."] }; }

  // Header row: col 0 == "Day", the rest are month labels (Sept-25, Oct-25, …).
  const headerRow = grid.findIndex((row) => row && /^day$/i.test(str(row[0])));
  if (headerRow < 0) return { events: [], tests: [], errors: ["Couldn't find the 'Day' header row — use the standard LJ academic-calendar format."] };
  const months: { col: number; year: number; month: number }[] = [];
  const hdr = grid[headerRow] ?? [];
  for (let c = 1; c < hdr.length; c++) {
    const parsed = parseMonthHeader(str(hdr[c]));
    if (parsed) months.push({ col: c, ...parsed });
  }
  if (months.length === 0) return { events: [], tests: [], errors: ["No month columns (e.g. Sept-25) found in the header row."] };

  const events: CalEvent[] = [];
  const tests: CalTest[] = [];
  const seen = new Set<string>(); // dedupe identical date+title
  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;
    for (const mo of months) {
      const cell = str(row[mo.col]);
      if (!cell) continue;
      const m = cell.match(/^(\d{1,2})\s*[-.)]\s*(.*)$/s);
      if (!m) continue;
      const day = Number(m[1]);
      const label = m[2].replace(/\s+/g, " ").trim();
      if (!label || day < 1 || day > 31) continue; // date-only cell, no event
      const date = new Date(Date.UTC(mo.year, mo.month - 1, day));
      if (Number.isNaN(date.getTime())) continue;

      const test = label.match(/test-\s*([1-4])/i);
      if (test) {
        const subject = label.split(/:/).slice(1).join(":").trim() || "General";
        tests.push({ phase: Number(test[1]), subject, date });
      }
      const type = classify(label);
      if (!type) continue;
      const key = `${date.toISOString().slice(0, 10)}|${label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ title: label.slice(0, 200), date, type });
    }
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  if (events.length === 0) errors.push("No events were found in the calendar.");
  return { events, tests, errors };
}
