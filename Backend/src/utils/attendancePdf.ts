// Dedicated renderers for the two attendance reports the coordinator generates.
// The generic ExportTable in export.ts can't express these layouts (per-batch
// grids with colour-coded roll numbers; a very wide compiled sheet), so they get
// their own pdfkit code. Both return a Buffer for the route to stream.
import PDFDocument from "pdfkit";

const BLUE = "#4A72B0";      // header band
const BLUE_LT = "#BDD7EE";   // sub-header
const RED = "#C0392B";       // partial-absence / below-threshold
const INK = "#111111";
const GREY = "#666666";
const GRID = "#B8B8B8";
// Reference "Compiled Attendance" sheet palette (matches the source HTML).
const HBLUE = "#4F81BD";     // header cells
const HGREEN = "#2E7D32";    // green title cell
const LOWRED = "#E53935";    // below-threshold % cell fill
const STRIPE = "#F7F7F7";    // even-row zebra

function buffered(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

// ── Daily: one page section per batch, two batches per row ──────────────────
export interface DailyLecture { no: number; subject: string; faculty: string; absent: { roll: number; partial: boolean }[] }
export interface DailyBatch { code: string; lectures: DailyLecture[] }
export interface DailyPdfData {
  institute: string; department: string; semester: string;
  date: string; weekNo: number | string; day: string; batches: DailyBatch[];
}

export function renderDailyAttendancePdf(data: DailyPdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  const bandRow = (text: string, bg: string, fg: string, size: number, h = 20) => {
    const y = doc.y;
    doc.rect(left, y, width, h).fill(bg);
    doc.fillColor(fg).font("Helvetica-Bold").fontSize(size).text(text, left, y + (h - size) / 2 - 1, { width, align: "center" });
    doc.fillColor(INK).font("Helvetica").y = y + h;
  };

  // ── Title + legend banner ──
  bandRow(data.institute, BLUE, "#ffffff", 13, 24);
  bandRow(`Department: ${data.department}   |   Semester: ${data.semester}`, BLUE_LT, "#1a3c66", 10);
  bandRow("FONT COLOUR: BLACK (Absent in all Lectures)", "#ECECEC", INK, 9, 16);
  bandRow("RED (Not attended all Lectures)", "#FBDDDD", RED, 9, 16);
  bandRow(`Date: ${data.date}   |   Week No: ${data.weekNo}   |   Day: ${data.day}`, "#E4EEDC", "#2f5d1e", 9, 16);
  doc.moveDown(0.5);

  const colW = (width - 12) / 2; // two batch tables per row, 12pt gutter
  // No | Subject | Faculty | Absent Nos
  const sub = [26, 88, 66, colW - 26 - 88 - 66];
  const rowGap = 4;
  const bottom = doc.page.height - doc.page.margins.bottom;

  const lectureHeight = (lec: DailyLecture) => {
    const txt = lec.absent.length ? lec.absent.map((a) => a.roll).join(", ") : "—";
    const h = doc.font("Helvetica").fontSize(8).heightOfString(txt, { width: sub[3] - 8 });
    return Math.max(20, h + 8);
  };
  const batchHeight = (b: DailyBatch) => 18 + 16 + b.lectures.reduce((s, l) => s + lectureHeight(l), 0);

  const drawBatch = (b: DailyBatch, x: number, y0: number) => {
    let y = y0;
    doc.rect(x, y, colW, 18).fill(BLUE);
    doc.fillColor("#fff").font("Helvetica-Bold").fontSize(10).text(`Batch: ${b.code}`, x, y + 4, { width: colW, align: "center" });
    y += 18;
    // column header
    doc.rect(x, y, colW, 16).fill(BLUE_LT);
    doc.fillColor("#1a3c66").fontSize(8).font("Helvetica-Bold");
    ["No", "Subject", "Faculty", "Absent Nos"].forEach((h, i) => {
      const cx = x + sub.slice(0, i).reduce((a, c) => a + c, 0);
      doc.text(h, cx + 4, y + 4, { width: sub[i] - 6, lineBreak: false });
    });
    y += 16;
    doc.font("Helvetica").fillColor(INK);
    b.lectures.forEach((lec) => {
      const h = lectureHeight(lec);
      doc.lineWidth(0.5).strokeColor(GRID).rect(x, y, colW, h).stroke();
      let cx = x;
      doc.fillColor(INK).fontSize(8).font("Helvetica");
      doc.text(String(lec.no), cx + 4, y + 4, { width: sub[0] - 6, lineBreak: false }); cx += sub[0];
      doc.text(lec.subject, cx + 4, y + 4, { width: sub[1] - 6, lineBreak: false }); cx += sub[1];
      doc.text(lec.faculty, cx + 4, y + 4, { width: sub[2] - 6, lineBreak: false }); cx += sub[2];
      // Absent Nos: colour each roll number (red = partial, black = absent-all)
      if (!lec.absent.length) {
        doc.fillColor(GREY).text("—", cx + 4, y + 4, { width: sub[3] - 8 });
      } else {
        doc.fontSize(8);
        const startX = cx + 4;
        doc.text("", startX, y + 4, { width: sub[3] - 8, continued: false });
        doc.y = y + 4; doc.x = startX;
        lec.absent.forEach((a, i) => {
          const last = i === lec.absent.length - 1;
          doc.fillColor(a.partial ? RED : INK).font(a.partial ? "Helvetica-Bold" : "Helvetica")
            .text(a.roll + (last ? "" : ", "), { width: sub[3] - 8, continued: !last });
        });
      }
      doc.fillColor(INK).font("Helvetica");
      y += h;
    });
    // vertical separators
    doc.lineWidth(0.5).strokeColor(GRID);
    let vx = x;
    for (let i = 0; i < sub.length - 1; i++) { vx += sub[i]; doc.moveTo(vx, y0 + 34).lineTo(vx, y).stroke(); }
    return y;
  };

  // pair batches: left/right, advance by the taller
  for (let i = 0; i < data.batches.length; i += 2) {
    const pair = data.batches.slice(i, i + 2);
    const need = Math.max(...pair.map(batchHeight));
    if (doc.y + need > bottom) { doc.addPage({ size: "A4", layout: "landscape", margin: 28 }); }
    const y0 = doc.y;
    let maxY = y0;
    pair.forEach((b, k) => { const endY = drawBatch(b, left + k * (colW + 12), y0); maxY = Math.max(maxY, endY); });
    doc.y = maxY + rowGap;
  }
  return buffered(doc);
}

// ── Weekly: compiled sheet — 3 sub-columns per subject, exactly like the
//    institutional "Compiled Attendance" spreadsheet (Total Attended / Total
//    Lecture / Overall %), plus a current-week group, an OVERALL group and mentor.
export interface WeeklyStudent {
  roll: number; div: string; enrollmentNo: string; name: string;
  weekAttended: number; weekTotal: number;             // current week (all subjects)
  subjects: { attended: number; total: number }[];     // aligned to subjectCodes, cumulative
  overallAttended: number; overallTotal: number; mentor: string;
}
export interface WeeklyPdfData {
  institute: string; department: string; semester: string; uptoLabel: string;
  weekNo: number | string;
  subjectCodes: string[]; students: WeeklyStudent[]; threshold: number;
}

// pdfkit's lineBreak:false overflows rather than clips, so a long name bleeds into
// the next row. Hard-cap the character count to keep every row one line tall.
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const pctStr = (a: number, t: number) => (t > 0 ? ((a / t) * 100).toFixed(2) + "%" : "-");

export function renderWeeklyAttendancePdf(data: WeeklyPdfData): Promise<Buffer> {
  // A3 landscape: 29 columns need the width to stay legible, matching the source sheet.
  const PAGE = { size: "A3" as const, layout: "landscape" as const, margin: 18 };
  const doc = new PDFDocument(PAGE);
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;
  const WHITE = "#ffffff";

  // Layout: identity(4) | 3 cells × (Week + subjects + Overall) | Mentor
  const idW = [30, 30, 108, 200];               // Roll, Div, Enrollment, Name
  const idLabels = ["Roll No.", "Div", "Enrollment No", "Name"];
  const mentorW = 58;
  const idTotal = idW.reduce((a, c) => a + c, 0);
  const groupLabels = [`Compiled Attendance of Week-${data.weekNo}`, ...data.subjectCodes, "OVERALL"];
  const G = groupLabels.length;                 // week + N subjects + overall
  const dataCols = G * 3;
  const cell = (width - idTotal - mentorW) / dataCols;
  const groupW = cell * 3;

  const idX = (i: number) => left + idW.slice(0, i).reduce((a, c) => a + c, 0);
  const dataStart = left + idTotal;
  const groupX = (g: number) => dataStart + g * groupW;
  const cellX = (c: number) => dataStart + c * cell;
  const mentorX = dataStart + dataCols * cell;

  const titleH = 18, groupH = 20, subH = 24, headerH = titleH + groupH + subH;
  const rowH = 14;
  const bottom = doc.page.height - doc.page.margins.bottom - rowH;
  const grid = () => doc.lineWidth(0.5).strokeColor("#222222");

  // vertical separators shared by header body-rows and data rows
  const verticals: number[] = [];
  for (let i = 1; i < idW.length; i++) verticals.push(idX(i));
  for (let c = 0; c <= dataCols; c++) verticals.push(cellX(c));

  const drawHeader = () => {
    const y0 = doc.y;
    const y1 = y0 + titleH, y2 = y1 + groupH;

    // Title row: blue over identity, green over the rest.
    doc.rect(left, y0, idTotal, titleH).fill(HBLUE);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(9)
      .text(`${data.department} · ${data.semester} Compiled Attendance`, left + 2, y0 + (titleH - 9) / 2 - 1, { width: idTotal - 4, align: "center", lineBreak: false });
    doc.rect(dataStart, y0, width - idTotal, titleH).fill(HGREEN);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(9)
      .text(`Subjectwise Compiled Attendance ${data.uptoLabel} · Week-${data.weekNo}`, dataStart + 2, y0 + (titleH - 9) / 2 - 1, { width: width - idTotal - 4, align: "center", lineBreak: false });

    // Identity headers (span the group + sub rows).
    idLabels.forEach((lbl, i) => {
      doc.rect(idX(i), y1, idW[i], groupH + subH).fill(HBLUE);
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(7)
        .text(lbl, idX(i) + 1, y1 + (groupH + subH) / 2 - 4, { width: idW[i] - 2, align: "center" });
    });
    // Group headers.
    groupLabels.forEach((lbl, g) => {
      doc.rect(groupX(g), y1, groupW, groupH).fill(HBLUE);
      doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(6)
        .text(lbl, groupX(g) + 1, y1 + 3, { width: groupW - 2, align: "center" });
    });
    // Sub headers (Total Attended / Total Lecture / Overall %).
    for (let g = 0; g < G; g++) {
      ["Total Attended", "Total Lecture", "Overall %"].forEach((lbl, k) => {
        const cx = cellX(g * 3 + k);
        doc.rect(cx, y2, cell, subH).fill(HBLUE);
        doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(5.5)
          .text(lbl, cx + 1, y2 + 4, { width: cell - 2, align: "center" });
      });
    }
    // Mentor header (spans group + sub rows).
    doc.rect(mentorX, y1, mentorW, groupH + subH).fill(HBLUE);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(6.5)
      .text("MENTOR NAME", mentorX + 1, y1 + (groupH + subH) / 2 - 7, { width: mentorW - 2, align: "center" });

    // Grid.
    grid();
    doc.rect(left, y0, width, headerH).stroke();
    doc.moveTo(left, y1).lineTo(right, y1).stroke();       // under title
    doc.moveTo(dataStart, y2).lineTo(mentorX, y2).stroke(); // under group row (data area)
    for (let i = 1; i < idW.length; i++) doc.moveTo(idX(i), y1).lineTo(idX(i), y1 + groupH + subH).stroke();
    for (let c = 0; c <= dataCols; c++) { const vx = cellX(c); doc.moveTo(vx, c % 3 === 0 ? y1 : y2).lineTo(vx, y1 + groupH + subH).stroke(); }

    doc.fillColor(INK).font("Helvetica").y = y0 + headerH;
  };

  drawHeader();

  const ty = (y: number) => y + (rowH - 6.5) / 2 - 0.5;
  data.students.forEach((s, ri) => {
    if (doc.y > bottom) { doc.addPage(PAGE); drawHeader(); }
    const y = doc.y;
    if (ri % 2 === 1) { doc.rect(left, y, width, rowH).fill(STRIPE); }

    // Identity.
    doc.fillColor(INK).font("Helvetica").fontSize(6.5);
    doc.text(String(s.roll), idX(0) + 1, ty(y), { width: idW[0] - 2, align: "center", lineBreak: false });
    doc.text(s.div, idX(1) + 1, ty(y), { width: idW[1] - 2, align: "center", lineBreak: false });
    doc.text(s.enrollmentNo, idX(2) + 1, ty(y), { width: idW[2] - 2, align: "center", lineBreak: false });
    doc.text(clip(s.name, 46), idX(3) + 2, ty(y), { width: idW[3] - 4, align: "center", lineBreak: false });

    // Groups: week, subjects, overall — each as 3 cells.
    const triples = [
      { att: s.weekAttended, tot: s.weekTotal },
      ...s.subjects.map((x) => ({ att: x.attended, tot: x.total })),
      { att: s.overallAttended, tot: s.overallTotal },
    ];
    triples.forEach((t, g) => {
      const attX = cellX(g * 3), lecX = cellX(g * 3 + 1), pctX = cellX(g * 3 + 2);
      const low = t.tot > 0 && (t.att / t.tot) * 100 < data.threshold;
      doc.fillColor(INK).font("Helvetica").fontSize(6.5);
      doc.text(String(t.att), attX + 1, ty(y), { width: cell - 2, align: "center", lineBreak: false });
      doc.text(String(t.tot), lecX + 1, ty(y), { width: cell - 2, align: "center", lineBreak: false });
      if (low) { doc.rect(pctX, y, cell, rowH).fill(LOWRED); doc.fillColor(WHITE).font("Helvetica-Bold"); }
      else { doc.fillColor(INK).font("Helvetica"); }
      doc.fontSize(6.5).text(pctStr(t.att, t.tot), pctX + 1, ty(y), { width: cell - 2, align: "center", lineBreak: false });
    });

    // Mentor.
    doc.fillColor(INK).font("Helvetica").fontSize(6.5)
      .text(s.mentor || "—", mentorX + 1, ty(y), { width: mentorW - 2, align: "center", lineBreak: false });

    // Grid: outer box + every vertical separator.
    grid();
    doc.rect(left, y, width, rowH).stroke();
    for (const vx of verticals) doc.moveTo(vx, y).lineTo(vx, y + rowH).stroke();
    doc.y = y + rowH;
  });

  if (!data.students.length) doc.moveDown(1).fontSize(10).fillColor(GREY).text("No students in this semester.", left, doc.y);
  return buffered(doc);
}
