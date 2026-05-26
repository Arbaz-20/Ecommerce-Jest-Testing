/**
 * Builds PROJECT_GUIDE.pdf — full architecture + test-folder walkthrough
 * for the ecommerce-soa-jest project.
 *
 * Run:
 *     npx ts-node _build_pdf_guide.ts
 * Output:
 *     PROJECT_GUIDE.pdf  (in current directory)
 *
 * Requires: npm i pdfkit @types/pdfkit
 */
import PDFDocument from "pdfkit";
import fs from "fs";

const OUTPUT = "PROJECT_GUIDE.pdf";

// ── Units (PDFKit uses points; 1 cm = 28.3465 pt) ─────────────────────
const cm = 28.3465;

// ── Colors ────────────────────────────────────────────────────────────
const NAVY   = "#0B2545";
const TEAL   = "#13315C";
const ACCENT = "#8DA9C4";
const SOFT   = "#EEF4ED";
const INK    = "#1B1B1B";
const GREEN  = "#1F7A3A";
const RED    = "#B0413E";
const GOLD   = "#C9A227";
const GREY   = "#6C757D";
const BG     = "#F7F9FC";
const WHITE  = "#FFFFFF";

// A4 in points
const A4_W = 595.28;

const MARGIN = 1.6 * cm;
const CONTENT_W = A4_W - 2 * MARGIN;

const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: {
        Title: "Ecommerce SOA Backend — Project Guide",
        Author: "Project Documentation",
    },
    bufferPages: true,
});

doc.pipe(fs.createWriteStream(OUTPUT));

// ── Layout state ──────────────────────────────────────────────────────
let pageNum = 0;

// Move cursor below the header bar on every fresh page so content doesn't
// collide with the navy header.
function resetCursor() {
    doc.x = MARGIN;
    doc.y = 1.6 * cm;
}

doc.on("pageAdded", () => {
    pageNum++;
    resetCursor();
});
// First page is implicit; reset its cursor too.
pageNum = 1;
resetCursor();

// Draw header/footer chrome on every page at the END (bufferPages mode).
function drawChromeOnAllPages() {
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        // Neutralize margins so doc.text() in the header/footer zone doesn't
        // think the page is full and trigger continueOnNewPage.
        const origMargins = { ...doc.page.margins };
        doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

        const top = doc.page.height;
        doc.save();

        doc.rect(0, 0, A4_W, 1.0 * cm).fill(NAVY);
        doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(9);
        doc.text("Ecommerce SOA Backend — Project Guide", 1.5 * cm, 0.35 * cm, {
            lineBreak: false,
        });
        doc.font("Helvetica").fontSize(8.4);
        doc.text("Jest Testing Framework", A4_W - 1.5 * cm - 120, 0.35 * cm, {
            width: 120, align: "right", lineBreak: false,
        });

        doc.fillColor(GREY).font("Helvetica").fontSize(8.4);
        doc.text(`Page ${i + 1}`, 0, top - 0.8 * cm - 4, {
            width: A4_W, align: "center", lineBreak: false,
        });
        doc.strokeColor(ACCENT).lineWidth(0.4);
        doc.moveTo(1.5 * cm, top - 1.2 * cm).lineTo(A4_W - 1.5 * cm, top - 1.2 * cm).stroke();

        doc.restore();
        doc.page.margins = origMargins;
    }
}

// ── Text helpers ──────────────────────────────────────────────────────
type Style = {
    font?: string;
    size?: number;
    color?: string;
    align?: "left" | "center" | "right" | "justify";
    leading?: number;
    spaceAfter?: number;
    spaceBefore?: number;
};

const H1: Style = { font: "Helvetica-Bold", size: 22, color: NAVY, spaceAfter: 10 };
const H2: Style = { font: "Helvetica-Bold", size: 16, color: NAVY, spaceBefore: 14, spaceAfter: 6 };
const H3: Style = { font: "Helvetica-Bold", size: 12.5, color: TEAL, spaceBefore: 10, spaceAfter: 4 };
const BODY: Style = { font: "Helvetica", size: 10.2, color: INK, align: "justify", spaceAfter: 6, leading: 14 };
const COVERH: Style = { font: "Helvetica-Bold", size: 30, color: NAVY, align: "center" };
const COVERS: Style = { font: "Helvetica", size: 13, color: TEAL, align: "center", spaceAfter: 4 };

function ensureSpace(needed: number) {
    consumePendingBreak();
    const bottom = doc.page.height - MARGIN;
    if (doc.y + needed > bottom) {
        doc.addPage();
    }
}

// ── Inline rich-text parsing ──────────────────────────────────────────
type Segment = { text: string; bold: boolean; italic: boolean; mono: boolean };

function decodeEntities(s: string): string {
    return s
        .replace(/&mdash;/g, "—")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

function parseInline(text: string): Segment[] {
    const segs: Segment[] = [];
    let bold = false, italic = false, mono = false;
    let i = 0, buf = "";
    const flush = () => {
        if (buf) {
            segs.push({ text: decodeEntities(buf), bold, italic, mono });
            buf = "";
        }
    };
    while (i < text.length) {
        if (text[i] === "<") {
            const close = text.indexOf(">", i);
            if (close === -1) { buf += text[i++]; continue; }
            const tag = text.slice(i + 1, close);
            const low = tag.toLowerCase();
            if (low === "b")            { flush(); bold = true; }
            else if (low === "/b")      { flush(); bold = false; }
            else if (low === "i")       { flush(); italic = true; }
            else if (low === "/i")      { flush(); italic = false; }
            else if (low.startsWith("font") && low.includes("courier")) {
                flush(); mono = true;
            }
            else if (low === "/font")   { flush(); mono = false; }
            else                        { buf += text.slice(i, close + 1); }
            i = close + 1;
        } else {
            buf += text[i++];
        }
    }
    flush();
    return segs;
}

function fontFor(seg: Segment, baseFont: string): string {
    if (seg.mono) return seg.bold ? "Courier-Bold" : (seg.italic ? "Courier-Oblique" : "Courier");
    // Honor base font (e.g. Helvetica-Bold for headings); promote with italic.
    if (baseFont.startsWith("Helvetica-Bold")) {
        return seg.italic ? "Helvetica-BoldOblique" : "Helvetica-Bold";
    }
    if (seg.bold && seg.italic) return "Helvetica-BoldOblique";
    if (seg.bold)               return "Helvetica-Bold";
    if (seg.italic)             return "Helvetica-Oblique";
    return "Helvetica";
}

type Word = { text: string; font: string; size: number; w: number; isSpace: boolean };

function richText(text: string, opts: {
    width: number; baseFont: string; baseSize: number; color: string;
    align?: "left" | "center" | "right" | "justify"; lineGap?: number;
    x?: number; y?: number;
}) {
    const segs = parseInline(text);
    if (segs.length === 0) return;

    // Tokenize each segment into words (whitespace runs treated as single spaces)
    const words: Word[] = [];
    for (const s of segs) {
        const font = fontFor(s, opts.baseFont);
        const parts = s.text.split(/(\s+)/);
        for (const part of parts) {
            if (!part) continue;
            const isSpace = /^\s+$/.test(part);
            doc.font(font).fontSize(opts.baseSize);
            const w = doc.widthOfString(isSpace ? " " : part);
            words.push({ text: isSpace ? " " : part, font, size: opts.baseSize, w, isSpace });
        }
    }

    // Greedy line wrap
    const lines: Word[][] = [];
    let cur: Word[] = [];
    let curW = 0;
    for (const w of words) {
        if (w.isSpace) {
            if (cur.length === 0) continue;
            cur.push(w);
            curW += w.w;
        } else if (curW + w.w <= opts.width) {
            cur.push(w);
            curW += w.w;
        } else {
            // Drop trailing space from current line
            while (cur.length && cur[cur.length - 1].isSpace) {
                curW -= cur[cur.length - 1].w;
                cur.pop();
            }
            if (cur.length) lines.push(cur);
            cur = [w];
            curW = w.w;
        }
    }
    while (cur.length && cur[cur.length - 1].isSpace) cur.pop();
    if (cur.length) lines.push(cur);

    // Line height
    const lineH = opts.baseSize * 1.2 + (opts.lineGap ?? 0);

    let cx = opts.x ?? doc.x;
    let cy = opts.y ?? doc.y;

    doc.fillColor(opts.color);

    for (const line of lines) {
        // Auto-paginate manually if needed
        if (cy + lineH > doc.page.height - MARGIN) {
            doc.addPage();
            // pageAdded handler resets doc.y to 1.6cm
            cy = doc.y;
            cx = opts.x ?? doc.x;
        }

        const lineWords = line.filter((_, i, arr) => !(i === arr.length - 1 && _.isSpace));
        const lineW = lineWords.reduce((a, w) => a + w.w, 0);

        let startX = cx;
        let extraSpace = 0;
        if (opts.align === "center") {
            startX = cx + (opts.width - lineW) / 2;
        } else if (opts.align === "right") {
            startX = cx + opts.width - lineW;
        } else if (opts.align === "justify") {
            const spaces = lineWords.filter(w => w.isSpace).length;
            const isLastLine = line === lines[lines.length - 1];
            if (!isLastLine && spaces > 0) {
                extraSpace = (opts.width - lineW) / spaces;
            }
        }

        let px = startX;
        for (const w of lineWords) {
            doc.font(w.font).fontSize(w.size);
            doc.text(w.text, px, cy, { lineBreak: false });
            px += w.w + (w.isSpace ? extraSpace : 0);
        }
        cy += lineH;
    }

    if (opts.y === undefined) {
        doc.y = cy;
        doc.x = MARGIN;
    }
}

function richHeight(text: string, opts: { width: number; baseFont: string; baseSize: number; }): number {
    const segs = parseInline(text);
    if (segs.length === 0) return 0;
    // Replicate the wrap logic from richText to compute exact line count.
    const words: Word[] = [];
    for (const s of segs) {
        const font = fontFor(s, opts.baseFont);
        const parts = s.text.split(/(\s+)/);
        for (const part of parts) {
            if (!part) continue;
            const isSpace = /^\s+$/.test(part);
            doc.font(font).fontSize(opts.baseSize);
            const w = doc.widthOfString(isSpace ? " " : part);
            words.push({ text: isSpace ? " " : part, font, size: opts.baseSize, w, isSpace });
        }
    }
    let lines = 0;
    let cur = 0;
    let curW = 0;
    for (const w of words) {
        if (w.isSpace) {
            if (cur === 0) continue;
            cur++;
            curW += w.w;
        } else if (curW + w.w <= opts.width) {
            cur++;
            curW += w.w;
        } else {
            if (cur > 0) lines++;
            cur = 1;
            curW = w.w;
        }
    }
    if (cur > 0) lines++;
    return Math.max(1, lines) * opts.baseSize * 1.2;
}

function p(text: string, st: Style = BODY) {
    if (st.spaceBefore) doc.moveDown(st.spaceBefore / 12);
    ensureSpace((st.size ?? 10) + 4);
    const size = st.size ?? 10.2;
    const lineGap = (st.leading ?? size * 1.25) - size;
    richText(text, {
        width: CONTENT_W,
        baseFont: st.font ?? "Helvetica",
        baseSize: size,
        color: st.color ?? INK,
        align: st.align ?? "left",
        lineGap,
    });
    if (st.spaceAfter) doc.moveDown(st.spaceAfter / 12);
}

function spacer(h: number) {
    ensureSpace(h);
    doc.y += h;
}

function code(text: string) {
    const lines = text.split("\n");
    const fontSize = 8.6;
    const lineH = 11;
    const padding = 6;
    const blockH = lines.length * lineH + padding * 2;
    ensureSpace(blockH + 6);

    const x = doc.x;
    const y = doc.y;
    doc.save();
    doc.rect(x, y, CONTENT_W, blockH)
       .fillAndStroke(SOFT, ACCENT);
    doc.lineWidth(0.4);
    doc.restore();

    doc.font("Courier").fontSize(fontSize).fillColor(INK);
    let ty = y + padding;
    for (const line of lines) {
        doc.text(line, x + padding, ty, {
            width: CONTENT_W - padding * 2,
            lineBreak: false,
        });
        ty += lineH;
    }
    doc.y = y + blockH + 8;
    doc.x = MARGIN;
}

function pageBreak() {
    // Deferred: just request a fresh page when the next drawing call needs it.
    // Avoids stacking up empty pages when text auto-paginated immediately
    // before this call.
    pendingPageBreak = true;
}

let pendingPageBreak = false;
function consumePendingBreak() {
    if (pendingPageBreak) {
        pendingPageBreak = false;
        // Only add if cursor moved meaningfully on this page.
        if (doc.y - 1.6 * cm > 1.0 * cm) doc.addPage();
    }
}

// ── Section header bar ────────────────────────────────────────────────
function sectionHeader(label: string) {
    const h = 28;
    ensureSpace(h + 6);
    const x = doc.x;
    const y = doc.y;
    doc.rect(x, y, CONTENT_W, h).fill(NAVY);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(13)
       .text(label, x + 10, y + 7, { width: CONTENT_W - 20, lineBreak: false });
    doc.y = y + h + 4;
    doc.x = MARGIN;
}

// ── Key/Value table ───────────────────────────────────────────────────
function kvTable(rows: Array<[string, string]>, keyW = 4.5 * cm) {
    const valW = CONTENT_W - keyW;
    const padX = 6, padY = 5;
    const keyFont = "Helvetica-Bold";
    const valFont = "Helvetica";
    const fontSize = 9.4;

    for (const [k, v] of rows) {
        const kH = richHeight(k, { width: keyW - padX * 2, baseFont: keyFont, baseSize: fontSize });
        const vH = richHeight(v, { width: valW - padX * 2, baseFont: valFont, baseSize: fontSize });
        const rowH = Math.max(kH, vH) + padY * 2;
        ensureSpace(rowH);

        const x = doc.x;
        const y = doc.y;

        doc.rect(x, y, keyW, rowH).fillAndStroke(SOFT, ACCENT);
        doc.lineWidth(0.3);
        doc.rect(x + keyW, y, valW, rowH).strokeColor(ACCENT).stroke();

        richText(k, {
            width: keyW - padX * 2, baseFont: keyFont, baseSize: fontSize,
            color: NAVY, x: x + padX, y: y + padY,
        });
        richText(v, {
            width: valW - padX * 2, baseFont: valFont, baseSize: fontSize,
            color: INK, x: x + keyW + padX, y: y + padY,
        });

        doc.y = y + rowH;
        doc.x = MARGIN;
    }
}

// ── Bullet list ───────────────────────────────────────────────────────
function bullets(items: string[]) {
    for (const it of items) {
        ensureSpace(20);
        const x = doc.x;
        const y = doc.y;
        doc.circle(x + 4, y + 6, 1.6).fill(NAVY);
        richText(it, {
            width: CONTENT_W - 14,
            baseFont: "Helvetica",
            baseSize: 10.2,
            color: INK,
            align: "left",
            lineGap: 2,
            x: x + 14,
            y,
        });
        doc.moveDown(0.2);
        doc.x = MARGIN;
    }
}

// ── Diagram primitives ────────────────────────────────────────────────
function roundRectFill(x: number, y: number, w: number, h: number, r: number,
                       fill: string, stroke: string | null = null) {
    doc.save();
    doc.roundedRect(x, y, w, h, r);
    if (stroke) {
        doc.fillAndStroke(fill, stroke);
    } else {
        doc.fill(fill);
    }
    doc.restore();
}

function centeredText(text: string, x: number, y: number, font: string, size: number, color: string) {
    doc.font(font).fontSize(size).fillColor(color);
    const w = doc.widthOfString(text);
    doc.text(text, x - w / 2, y, { lineBreak: false });
}

// ── Architecture diagram ──────────────────────────────────────────────
function archDiagram() {
    const W = CONTENT_W;
    const H = 12 * cm;
    ensureSpace(H + 10);

    const ox = doc.x;
    const oy = doc.y;

    // Outer frame
    roundRectFill(ox, oy, W, H, 6, BG, ACCENT);

    const box = (rx: number, ry: number, rw: number, rh: number,
                 label: string, fill: string, sub: string | null = null,
                 txt = WHITE, font = 9.5) => {
        roundRectFill(ox + rx, oy + ry, rw, rh, 4, fill, NAVY);
        if (sub) {
            centeredText(label, ox + rx + rw / 2, oy + ry + rh / 2 - 8, "Helvetica-Bold", font, txt);
            centeredText(sub, ox + rx + rw / 2, oy + ry + rh / 2 + 4, "Helvetica", font - 1.5, txt);
        } else {
            centeredText(label, ox + rx + rw / 2, oy + ry + rh / 2 - font / 2, "Helvetica-Bold", font, txt);
        }
    };

    const cx = W / 2;

    // Client
    box(cx - 3.2 * cm, 0.6 * cm, 6.4 * cm, 1.0 * cm,
        "HTTP Client", GREY, "curl / Postman / frontend");

    // Gateway
    box(0.8 * cm, 2.2 * cm, W - 1.6 * cm, 1.4 * cm,
        "Express Gateway  (createApp)", NAVY,
        "cors  |  json  |  /health  |  routing  |  errorHandler");

    // Services
    const serviceY = 5.0 * cm;
    const sw = (W - 1.6 * cm - 0.6 * cm * 3) / 4;
    const services: Array<[string, string]> = [
        ["User Service",    "register / login / me"],
        ["Product Service", "CRUD / search / stock"],
        ["Order Service",   "create / cancel / FSM"],
        ["Payment Service", "process / refund / gateway sim"],
    ];
    services.forEach(([name, sub], i) => {
        const x = 0.8 * cm + i * (sw + 0.2 * cm);
        box(x, serviceY, sw, 1.7 * cm, name, TEAL, sub, WHITE, 8.8);
    });

    // Shared
    box(0.8 * cm, 7.4 * cm, W - 1.6 * cm, 1.2 * cm,
        "Shared Layer", ACCENT,
        "db pool  |  JWT auth  |  errors  |  utils  |  types", NAVY);

    // Persistence
    box(2 * cm, 9.4 * cm, (W - 4 * cm) / 2 - 0.3 * cm, 1.6 * cm,
        "PostgreSQL 16", GREEN,
        "users • products • orders • items • payments • coupons");
    box(W / 2 + 0.3 * cm, 9.4 * cm, (W - 4 * cm) / 2 - 0.3 * cm, 1.6 * cm,
        "Redis 7", RED, "cache  /  session  (planned)");

    // Arrows
    doc.strokeColor(NAVY).lineWidth(1.1);
    doc.moveTo(ox + cx, oy + 1.6 * cm).lineTo(ox + cx, oy + 2.2 * cm).stroke();
    for (let i = 0; i < 4; i++) {
        const x = 0.8 * cm + i * (sw + 0.2 * cm) + sw / 2;
        doc.moveTo(ox + x, oy + 3.6 * cm).lineTo(ox + x, oy + serviceY).stroke();
        doc.moveTo(ox + x, oy + serviceY + 1.7 * cm).lineTo(ox + x, oy + 7.4 * cm).stroke();
    }
    doc.moveTo(ox + W / 3, oy + 8.6 * cm).lineTo(ox + W / 3, oy + 9.4 * cm).stroke();
    doc.moveTo(ox + 2 * W / 3, oy + 8.6 * cm).lineTo(ox + 2 * W / 3, oy + 9.4 * cm).stroke();

    // Title
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11)
       .text("Figure 1 — SOA Architecture", ox + 0.8 * cm, oy + 0.2 * cm, { lineBreak: false });

    doc.y = oy + H + 8;
    doc.x = MARGIN;
}

// ── Checkout sequence diagram ─────────────────────────────────────────
function checkoutSequence() {
    const W = CONTENT_W;
    const H = 13 * cm;
    ensureSpace(H + 10);

    const ox = doc.x;
    const oy = doc.y;
    roundRectFill(ox, oy, W, H, 6, BG, ACCENT);

    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11)
       .text("Figure 2 — Checkout Sequence (E2E)", ox + 0.8 * cm, oy + 0.2 * cm, { lineBreak: false });

    const actors = ["Client", "Gateway", "UserSvc", "ProductSvc", "OrderSvc", "PaymentSvc", "PostgreSQL"];
    const n = actors.length;
    const left = 0.8 * cm;
    const right = W - 0.8 * cm;
    const top = 1.6 * cm;
    const bottom = H - 0.6 * cm;
    const gap = (right - left) / (n - 1);

    // Actors + lifelines
    actors.forEach((a, i) => {
        const x = left + i * gap;
        roundRectFill(ox + x - 1.05 * cm, oy + top - 0.55 * cm, 2.1 * cm, 0.55 * cm, 3, NAVY);
        centeredText(a, ox + x, oy + top - 0.40 * cm, "Helvetica-Bold", 8, WHITE);
        doc.strokeColor(ACCENT).lineWidth(0.6).dash(2, { space: 2 });
        doc.moveTo(ox + x, oy + top).lineTo(ox + x, oy + bottom).stroke();
        doc.undash();
    });

    const arrow = (fromI: number, toI: number, y: number, label: string,
                   ret = false, color = NAVY) => {
        const x1 = ox + left + fromI * gap;
        const x2 = ox + left + toI * gap;
        const yy = oy + y;
        doc.strokeColor(color).fillColor(color).lineWidth(0.9);
        if (ret) doc.dash(3, { space: 2 });
        // Self-message
        if (fromI === toI) {
            const r = 8;
            doc.moveTo(x1, yy).lineTo(x1 + 18, yy)
               .lineTo(x1 + 18, yy + r).lineTo(x1 + 2, yy + r).stroke();
            doc.undash();
            doc.moveTo(x1 + 2, yy + r).lineTo(x1 + 6, yy + r - 3).stroke();
            doc.moveTo(x1 + 2, yy + r).lineTo(x1 + 6, yy + r + 3).stroke();
        } else {
            doc.moveTo(x1, yy).lineTo(x2, yy).stroke();
            doc.undash();
            const ah = 0.18 * cm;
            if (x2 > x1) {
                doc.moveTo(x2, yy).lineTo(x2 - ah, yy + ah / 2).stroke();
                doc.moveTo(x2, yy).lineTo(x2 - ah, yy - ah / 2).stroke();
            } else {
                doc.moveTo(x2, yy).lineTo(x2 + ah, yy + ah / 2).stroke();
                doc.moveTo(x2, yy).lineTo(x2 + ah, yy - ah / 2).stroke();
            }
        }
        doc.fillColor(NAVY).font("Helvetica").fontSize(7.6);
        const mid = (x1 + x2) / 2;
        const tw = doc.widthOfString(label);
        doc.text(label, mid - tw / 2, yy - 9, { lineBreak: false });
    };

    let y = top + 1.2 * cm;
    const step = 0.7 * cm;
    arrow(0, 1, y, "POST /api/auth/register"); y += step;
    arrow(1, 2, y, "registerUser()"); y += step;
    arrow(2, 6, y, "INSERT INTO users"); y += step;
    arrow(1, 0, y, "201 { token }", true, GREEN); y += step;
    arrow(0, 1, y, "POST /api/orders  (Bearer)"); y += step;
    arrow(1, 4, y, "createOrder(dto)"); y += step;
    arrow(4, 3, y, "findById + updateStock"); y += step;
    arrow(3, 6, y, "UPDATE products SET stock = ..."); y += step;
    arrow(4, 6, y, "INSERT INTO orders + order_items"); y += step;
    arrow(1, 0, y, "201 order { status: pending_payment }", true, GREEN); y += step;
    arrow(0, 1, y, "POST /api/payments"); y += step;
    arrow(1, 5, y, "processPayment(dto)"); y += step;
    arrow(5, 5, y, "PaymentGateway.charge()"); y += step;
    arrow(5, 4, y, "orderRepo.updateStatus('paid')"); y += step;
    arrow(1, 0, y, "201 payment { status: captured }", true, GREEN);

    doc.y = oy + H + 8;
    doc.x = MARGIN;
}

// ── Test pyramid ──────────────────────────────────────────────────────
function testPyramid() {
    const W = 12 * cm;
    const H = 8 * cm;
    ensureSpace(H + 10);

    const ox = doc.x + (CONTENT_W - W) / 2;
    const oy = doc.y;
    roundRectFill(ox, oy, W, H, 6, BG, ACCENT);

    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(10)
       .text("Figure 3 — Test Pyramid", ox + 0.6 * cm, oy + 0.2 * cm, { lineBreak: false });

    const baseY = oy + H - 0.9 * cm;
    const peakY = oy + 1.4 * cm;
    const midx = ox + W / 2;

    const layers: Array<[string, string, number, number]> = [
        ["Unit  (~40 tests, ~1.5 s)",        GREEN, 0.0, 0.40],
        ["Integration  (~15 tests, ~3.0 s)", GOLD,  0.40, 0.74],
        ["E2E  (~5 flows, ~2.5 s)",          RED,   0.74, 1.0],
    ];

    for (const [label, col, lo, hi] of layers) {
        const yLo = baseY + (peakY - baseY) * lo;
        const yHi = baseY + (peakY - baseY) * hi;
        const wLo = (W - 2 * cm) * (1 - lo);
        const wHi = (W - 2 * cm) * (1 - hi);

        doc.save();
        doc.moveTo(midx - wLo / 2, yLo)
           .lineTo(midx + wLo / 2, yLo)
           .lineTo(midx + wHi / 2, yHi)
           .lineTo(midx - wHi / 2, yHi)
           .closePath()
           .fillAndStroke(col, NAVY);
        doc.restore();

        centeredText(label, midx, (yLo + yHi) / 2 - 4, "Helvetica-Bold", 9, WHITE);
    }

    doc.y = oy + H + 8;
    doc.x = MARGIN;
}

// ── Order FSM ─────────────────────────────────────────────────────────
function orderFSM() {
    const W = CONTENT_W;
    const H = 9 * cm;
    ensureSpace(H + 10);

    const ox = doc.x;
    const oy = doc.y;
    roundRectFill(ox, oy, W, H, 6, BG, ACCENT);

    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11)
       .text("Figure 4 — Order State Machine", ox + 0.8 * cm, oy + 0.2 * cm, { lineBreak: false });

    const state = (x: number, y: number, label: string, col = TEAL) => {
        roundRectFill(ox + x - 1.4 * cm, oy + y - 0.45 * cm, 2.8 * cm, 0.9 * cm, 5, col, NAVY);
        centeredText(label, ox + x, oy + y - 4, "Helvetica-Bold", 8.6, WHITE);
    };

    const edge = (x1: number, y1: number, x2: number, y2: number, col = NAVY) => {
        doc.strokeColor(col).fillColor(col).lineWidth(0.9);
        doc.moveTo(ox + x1, oy + y1).lineTo(ox + x2, oy + y2).stroke();
        const ah = 0.18 * cm;
        const ang = Math.atan2(y2 - y1, x2 - x1);
        doc.moveTo(ox + x2, oy + y2)
           .lineTo(ox + x2 - ah * Math.cos(ang - 0.4), oy + y2 - ah * Math.sin(ang - 0.4))
           .stroke();
        doc.moveTo(ox + x2, oy + y2)
           .lineTo(ox + x2 - ah * Math.cos(ang + 0.4), oy + y2 - ah * Math.sin(ang + 0.4))
           .stroke();
    };

    const rowY = 3.0 * cm;
    const positions: Record<string, [number, number]> = {
        "pending":         [2.0 * cm,  rowY],
        "pending_payment": [5.6 * cm,  rowY],
        "paid":            [9.0 * cm,  rowY],
        "processing":      [12.0 * cm, rowY],
        "shipped":         [14.6 * cm, rowY],
        "delivered":       [14.6 * cm, rowY + 2.8 * cm],
        "cancelled":       [4.0 * cm,  rowY + 2.8 * cm],
        "refunded":        [10.5 * cm, rowY + 2.8 * cm],
    };

    for (const [name, [x, y]] of Object.entries(positions)) {
        const col = (name === "cancelled" || name === "refunded") ? RED
                  : (name === "delivered") ? GREEN
                  : TEAL;
        state(x, y, name, col);
    }

    const e = (a: string, b: string, col = NAVY) => {
        const [x1, y1] = positions[a];
        const [x2, y2] = positions[b];
        edge(x1, y1, x2, y2, col);
    };

    e("pending", "pending_payment");
    e("pending_payment", "paid");
    e("paid", "processing");
    e("processing", "shipped");
    e("shipped", "delivered");
    e("pending", "cancelled", RED);
    e("pending_payment", "cancelled", RED);
    e("processing", "cancelled", RED);
    e("paid", "refunded", RED);

    doc.y = oy + H + 8;
    doc.x = MARGIN;
}

// ─────────────────────────────────────────────────────────────────────
// Story
// ─────────────────────────────────────────────────────────────────────

// Cover
spacer(4 * cm);
p("ECOMMERCE  SOA  BACKEND", COVERH);
spacer(0.4 * cm);
p("Project Guide & Test-Folder Walkthrough", COVERS);
spacer(0.2 * cm);
p("Service-Oriented Architecture · Node.js · TypeScript · Jest", COVERS);
spacer(3 * cm);
sectionHeader("Inside this document");
spacer(0.3 * cm);
p("1.  System architecture (high-level diagram + tier-by-tier walkthrough)", BODY);
p("2.  Request lifecycle — gateway, services, shared layer", BODY);
p("3.  Domain model and order state machine", BODY);
p("4.  Complete test-folder breakdown (unit / integration / e2e)", BODY);
p("5.  Jest multi-project configuration explained", BODY);
p("6.  Fixtures, mocks, lifecycle hooks", BODY);
p("7.  CI/CD pipeline overview", BODY);
pageBreak();

// 1. Overview
p("1.  Project Overview", H1);
p("This codebase is a complete Service-Oriented Architecture (SOA) ecommerce backend that demonstrates a production-grade multi-layer test strategy with Jest. The system is split into four bounded services — User, Product, Order, and Payment — fronted by a single Express gateway and backed by PostgreSQL.", BODY);
p("The primary goal of the repository is testing pedagogy: it is structured to show how unit, integration, and end-to-end tests differ in scope, speed, and infrastructure needs, and how Jest can run them all from a single configuration file via the multi-project feature.", BODY);
spacer(0.3 * cm);
kvTable([
    ["Runtime",   "Node.js 20+, TypeScript 5.6 (strict)"],
    ["HTTP",      "Express 4.21"],
    ["Database",  "PostgreSQL 16 (pg pool)"],
    ["Cache",     "Redis 7 (provisioned, reserved for future use)"],
    ["Auth",      "JWT (jsonwebtoken) + bcryptjs password hashing"],
    ["Validation","Zod schemas + custom service-level checks"],
    ["Testing",   "Jest 29 + ts-jest + Supertest"],
    ["CI",        "GitHub Actions (3 stages)"],
    ["Container", "docker-compose.test.yml (Postgres + Redis)"],
]);
pageBreak();

// 2. Architecture
p("2.  System Architecture", H1);
p("The system follows a layered SOA pattern. A single Express application (the Gateway) is the only HTTP entry point. Each domain service owns its routes, service-layer business logic, and a repository for data access. A Shared Layer centralises cross-cutting concerns: the pg connection pool, JWT helpers, typed error classes, and pure utility functions.", BODY);
spacer(0.3 * cm);
archDiagram();
spacer(0.4 * cm);
p("2.1  Gateway Tier  (src/services/gateway/app.ts)", H3);
p("The createApp() factory builds and returns a fully wired Express application. It mounts:", BODY);
code(
`app.use(cors());
app.use(express.json());
app.get('/health', ...);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth',     userRoutes);
app.use((_req, res) => res.status(404).json({ ... }));
app.use(errorHandler);`);
p("Building the app via a factory (instead of side-effectful module-level code) is what makes Supertest integration and E2E tests possible — each suite calls createApp() to get a fresh in-process server.", BODY);

p("2.2  Service Tier", H3);
p("Every service has three files:", BODY);
kvTable([
    ["routes.ts",     "Express router; thin layer that parses requests, calls service methods, returns JSON."],
    ["service.ts",    "All business logic. Receives repositories via constructor (default new instance)."],
    ["repository.ts", "SQL queries using the shared query()/getOne()/getMany() helpers."],
]);
p("Cross-service collaboration uses direct repository imports: for example, OrderService uses ProductRepository to look up products and reserve stock. This is intentional — it keeps unit tests boring (you mock the repository, not an HTTP client) while still demonstrating cross-service coupling.", BODY);

p("2.3  Shared Layer", H3);
kvTable([
    ["database/index.ts",          "getPool(), query(), schema init, truncateAllTables()."],
    ["middleware/auth.ts",         "generateToken(), requireAuth, requireAdmin."],
    ["middleware/errorHandler.ts", "Typed error classes mapped to HTTP status codes."],
    ["utils/index.ts",             "Pure helpers: calculateTax, applyDiscount, paginate, generateId."],
    ["types/index.ts",             "Shared TS interfaces (User, Product, Order, Payment, DTOs)."],
]);
pageBreak();

// 3. Request lifecycle
p("3.  Request Lifecycle — Checkout Flow", H1);
p("The diagram below traces a full checkout: register, place an order, then pay. It shows precisely how the gateway dispatches into per-service modules and how those modules collaborate with the shared database layer.", BODY);
spacer(0.3 * cm);
checkoutSequence();
spacer(0.4 * cm);
p("Two important invariants emerge from the diagram:", BODY);
bullets([
    "Stock is decremented before the order row is written, so concurrent orders cannot oversell. The atomicity comes from the SQL UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING * pattern.",
    "Payment is only attempted when the order is in pending_payment, and a gateway success transitions both records (payment → captured, order → paid) in two writes.",
]);
pageBreak();

// 4. Domain model
p("4.  Domain Model", H1);
p("Six tables form the persistence layer. They are created by initializeDatabase() and dropped/truncated by sibling helpers in src/shared/database/index.ts.", BODY);
spacer(0.2 * cm);
kvTable([
    ["users",       "id, email, password_hash, first_name, last_name, role, is_active, timestamps"],
    ["products",    "id, name, description, price, stock, category, timestamps (CHECK price≥0, stock≥0)"],
    ["orders",      "id, user_id (FK), subtotal, tax, discount, total, status, shipping_*, payment_id, coupon_code"],
    ["order_items", "id, order_id (FK CASCADE), product_id, product_name, quantity, unit_price, total_price"],
    ["payments",    "id, order_id (FK), user_id (FK), amount, currency, method, status, transaction_id, failure_reason"],
    ["coupons",     "id, code (UNIQUE), discount_type, discount_value, min_order_amount, max_uses, current_uses, expires_at"],
]);
spacer(0.4 * cm);
orderFSM();
spacer(0.3 * cm);
p("The state machine is enforced inside OrderService.updateOrderStatus(). Each source state has an explicit list of allowed destinations; invalid transitions throw ValidationError. Cancellation rolls back reserved stock by incrementing the product rows.", BODY);
pageBreak();

// 5. Test strategy
p("5.  Test Strategy", H1);
p("The project layers tests in three rings — unit, integration, end-to-end — and uses Jest's multi-project feature to run them with different setups from a single configuration. The diagram below shows the rough volume and runtime distribution.", BODY);
spacer(0.4 * cm);
testPyramid();
spacer(0.4 * cm);

p("5.1  Unit Tests   tests/unit/", H2);
kvTable([
    ["Scope",        "Single method or pure function."],
    ["Database",     "Fully mocked via jest.mock() on the repository or shared/database module."],
    ["Speed",        "~30–80 ms per test."],
    ["External I/O", "None. PaymentGateway is itself a class so tests inject a mocked instance."],
    ["Files",        "5 spec files across 4 service folders."],
]);
spacer(0.2 * cm);
p("What is exercised", H3);
bullets([
    "product.service.test.ts — listing & pagination math; category filter; ILIKE search with min-length validation; create/update/delete; reserveStock decrement; rejection of negative price/stock and empty category.",
    "utils.test.ts — pure helpers: calculateTax, applyDiscount (percent + fixed), paginate bounds.",
    "order.service.test.ts — totals computation, stock reservation, status FSM transitions (valid + invalid), stock release on cancellation, terminal-state guard.",
    "payment.service.test.ts — successful capture; declined card (tok_fail); insufficient funds; amount mismatch vs order total; refund of captured payment; refund of non-captured rejected. Includes direct tests of the PaymentGateway simulator.",
    "user.service.test.ts — bcrypt hashing, JWT signing, duplicate email rejection, login with wrong password.",
]);
spacer(0.2 * cm);
p("Pattern", H3);
code(
`jest.mock('../../../src/services/order-service/order.repository');
jest.mock('../../../src/services/product-service/product.repository');

const mockOrderRepo   = new OrderRepository() as jest.Mocked<OrderRepository>;
const mockProductRepo = new ProductRepository() as jest.Mocked<ProductRepository>;
const service = new OrderService(mockOrderRepo, mockProductRepo);

mockProductRepo.findById.mockResolvedValueOnce({ id: 'p1', stock: 50, price: 100 });
mockOrderRepo.create.mockResolvedValueOnce({ id: 'o1', total: 270, status: 'pending_payment' });`);
pageBreak();

p("5.2  Integration Tests   tests/integration/", H2);
kvTable([
    ["Scope",     "Real HTTP via Supertest, real PostgreSQL, single endpoint at a time."],
    ["Database",  "Test container on port 5433. Schema initialised once per file; tables truncated before each test."],
    ["Speed",     "~150–250 ms per test."],
    ["Lifecycle", "integration.globalSetup verifies connectivity once; integration.setup runs initializeDatabase + truncateAllTables per file/test."],
]);
spacer(0.2 * cm);
p("What is exercised", H3);
bullets([
    "auth-api.test.ts — POST /api/auth/register happy path returning a JWT; duplicate-email rejection; short-password and invalid-email validation errors; POST /api/auth/login success and wrong-password rejection.",
    "product-api.test.ts — full CRUD against the real DB: list empty, list after seed, category filter, paginated retrieval (15 rows split into 2 pages), POST as admin succeeds, POST as customer is 403, POST without auth is 401, GET by id 404 for nonexistent UUID, PUT updates price, DELETE removes a row and subsequent GET returns 404, /search?q=keyboard performs an ILIKE search.",
]);
spacer(0.2 * cm);
p("Pattern", H3);
code(
`import request from 'supertest';
import { createApp } from '../../src/services/gateway/app';
import { query } from '../../src/shared/database';
import { generateAdminToken } from '../fixtures/testData';

const app = createApp();
const adminToken = generateAdminToken();

it('creates a product with admin token', async () => {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', \`Bearer \${adminToken}\`)
    .send(testProducts[0]);
  expect(res.status).toBe(201);
});`);
pageBreak();

p("5.3  End-to-End Tests   tests/e2e/", H2);
kvTable([
    ["Scope",    "Multi-service business flows that span the whole stack."],
    ["Database", "Same test Postgres as integration; truncated between tests."],
    ["Speed",    "~400–700 ms per flow (multiple HTTP requests each)."],
    ["Files",    "checkout-flow.test.ts, refund-flow.test.ts."],
]);
spacer(0.2 * cm);
p("checkout-flow.test.ts — the canonical happy path", H3);
bullets([
    "Step 1 — public browse: GET /api/products returns ≥ 3 items.",
    "Step 2 — view detail: GET /api/products/:id captures original stock.",
    "Step 3 — create order with two items and a shipping address. Asserts subtotal math and status === 'pending_payment'.",
    "Step 4 — verify stock was decremented by the ordered quantity.",
    "Step 5 — process payment with tok_visa_test; expects 201 and transactionId.",
    "Step 6 — re-fetch order; status === 'paid' and paymentId is populated.",
    "Step 7 — fetch payment by id; amount matches order total.",
    "Step 8 — list user orders; the new order is present.",
]);
spacer(0.1 * cm);
p("Negative flows in the same file", H3);
bullets([
    "Payment failure with tok_fail → 402 + order remains pending_payment.",
    "Cancellation of an order releases stock back to the product row.",
    "Order of 9999 units → 400 Insufficient stock.",
    "Unauthenticated order creation → 401.",
    "Customer B cannot read Customer A's order → 403.",
]);
spacer(0.2 * cm);
p("refund-flow.test.ts", H3);
p("Builds a captured payment via the API, then exercises POST /api/payments/:id/refund: a captured payment can be refunded, non-captured payments cannot, and the parent order status flips to refunded.", BODY);
pageBreak();

// 6. Test infrastructure
p("6.  Test Infrastructure", H1);

p("6.1  Jest Multi-Project Config", H2);
p("jest.config.ts defines six projects. Each testMatch targets a specific folder so npm run test:unit selects only unit projects, etc. Crucially, only the integration and e2e projects load global setup/teardown hooks — unit projects stay fast because they never touch a real DB.", BODY);
code(
`projects: [
  { displayName: 'unit:product', testMatch: ['<rootDir>/tests/unit/product-service/**/*.test.ts'], ... },
  { displayName: 'unit:order',   testMatch: ['<rootDir>/tests/unit/order-service/**/*.test.ts'],   ... },
  { displayName: 'unit:payment', testMatch: ['<rootDir>/tests/unit/payment-service/**/*.test.ts'], ... },
  { displayName: 'unit:user',    testMatch: ['<rootDir>/tests/unit/user-service/**/*.test.ts'],    ... },
  { displayName: 'integration',  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
    globalSetup:    '<rootDir>/tests/setup/integration.globalSetup.ts',
    globalTeardown: '<rootDir>/tests/setup/integration.globalTeardown.ts',
    setupFilesAfterSetup: ['<rootDir>/tests/setup/integration.setup.ts'] },
  { displayName: 'e2e',          testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
    globalSetup:    '<rootDir>/tests/setup/e2e.globalSetup.ts',
    globalTeardown: '<rootDir>/tests/setup/e2e.globalTeardown.ts',
    setupFilesAfterSetup: ['<rootDir>/tests/setup/e2e.setup.ts'] },
]
coverageThresholds: { global: { branches: 70, functions: 75, lines: 80, statements: 80 } }`);

p("6.2  Setup & Teardown Files", H2);
kvTable([
    ["unit.setup.ts",                "Silences console.log/error so unit-test output stays readable. Restored in afterAll."],
    ["integration.globalSetup.ts",   "One-time DB reachability check; sets env defaults (DB_HOST, DB_PORT 5433, DB_NAME, JWT_SECRET). Throws with a helpful 'docker compose up' hint if Postgres is unreachable."],
    ["integration.setup.ts",         "Per-file: beforeAll → initializeDatabase(); beforeEach → truncateAllTables(); afterAll → closePool()."],
    ["integration.globalTeardown.ts","Closes any lingering connections after the Jest run."],
    ["e2e.globalSetup.ts",           "Sets the same env defaults as integration, plus NODE_ENV=test."],
    ["e2e.setup.ts",                 "Same per-file truncate pattern as integration."],
    ["e2e.globalTeardown.ts",        "Final cleanup."],
]);

p("6.3  Fixtures   tests/fixtures/testData.ts", H2);
p("All shared test data lives here so specs stay declarative. Exports include:", BODY);
bullets([
    "testUsers.admin / .customer / .customer2 — ready-to-POST registration payloads.",
    "testProducts — five products spanning electronics and furniture categories.",
    "testAddresses.istanbul / .newyork — reusable shipping addresses.",
    "generateAdminToken(), generateCustomerToken(), generateTokenForUser(payload) — signed JWTs without going through the register endpoint.",
    "invalidProducts, invalidUsers — precomputed payloads for negative tests (missing name, negative price, short password, invalid email …).",
]);

p("6.4  Database Mock   tests/mocks/database.mock.ts", H2);
p("Replaces the real pg pool with jest.fn()s. Provides three primitive mocks (mockQuery, mockGetOne, mockGetMany) and four ergonomic helpers:", BODY);
kvTable([
    ["mockQueryReturning(row)", "Stubs an INSERT ... RETURNING * with rows:[row] and rowCount:1."],
    ["mockQueryCount(n)",       "Stubs a SELECT COUNT(*) with rows:[{count:n}]."],
    ["mockQueryDelete(ok)",     "Stubs a DELETE/UPDATE by setting rowCount to 1 or 0."],
    ["resetDbMocks()",          "Resets the three mocks. Call from beforeEach."],
]);
pageBreak();

// 7. CI/CD
p("7.  CI/CD Pipeline", H1);
p("GitHub Actions runs three jobs that mirror the local npm scripts. Splitting unit tests into their own job gives developers fast PR feedback even when the integration job is queued behind a slow container start.", BODY);
spacer(0.2 * cm);
kvTable([
    ["1.  unit-tests",
     "Checkout → setup Node → npm ci → npm run test:unit. No services. Typical runtime: ~30 s."],
    ["2.  integration-e2e-tests",
     "Defines a services.postgres container (image postgres:16) with healthcheck. Runs test:integration then test:e2e against it. Uses env vars matching integration.globalSetup.ts."],
    ["3.  coverage",
     "Re-runs everything with --coverage --ci --reporters=jest-junit. Uploads coverage/lcov.info and junit.xml as artifacts. Optional step posts a summary comment on the PR."],
]);
spacer(0.4 * cm);
p("7.1  Local equivalent", H3);
code(
`docker compose -f docker-compose.test.yml up -d --wait

npm run test:unit         # ~1.5 s — no DB
npm run test:integration  # ~3.0 s — real DB
npm run test:e2e          # ~2.5 s — full flows
npm run test:coverage     # everything + lcov + json-summary

docker compose -f docker-compose.test.yml down -v`);
pageBreak();

// 8. Appendix
p("Appendix A — Full File Index", H1);
p("Source files", H3);
code(
`src/index.ts
src/services/gateway/app.ts
src/services/user-service/{user.routes,user.service,user.repository}.ts
src/services/product-service/{product.routes,product.service,product.repository}.ts
src/services/order-service/{order.routes,order.service,order.repository}.ts
src/services/payment-service/{payment.routes,payment.service,payment.repository}.ts
src/shared/database/index.ts
src/shared/middleware/{auth,errorHandler}.ts
src/shared/types/index.ts
src/shared/utils/index.ts`);
p("Test files", H3);
code(
`tests/unit/product-service/product.service.test.ts
tests/unit/product-service/utils.test.ts
tests/unit/order-service/order.service.test.ts
tests/unit/payment-service/payment.service.test.ts
tests/unit/user-service/user.service.test.ts
tests/integration/auth-api.test.ts
tests/integration/product-api.test.ts
tests/e2e/checkout-flow.test.ts
tests/e2e/refund-flow.test.ts
tests/fixtures/testData.ts
tests/mocks/database.mock.ts
tests/setup/unit.setup.ts
tests/setup/integration.globalSetup.ts
tests/setup/integration.globalTeardown.ts
tests/setup/integration.setup.ts
tests/setup/e2e.globalSetup.ts
tests/setup/e2e.globalTeardown.ts
tests/setup/e2e.setup.ts`);
p("Build & config", H3);
code(
`jest.config.ts
tsconfig.json
docker-compose.test.yml
package.json`);
spacer(0.5 * cm);
p("Appendix B — Glossary", H1);
kvTable([
    ["SOA",             "Service-Oriented Architecture — modules are organised by business capability behind a single gateway."],
    ["Repository",      "Thin class wrapping all SQL for an aggregate. Mocked in unit tests."],
    ["DTO",             "Data Transfer Object — request/response shapes defined in shared/types."],
    ["Supertest",       "HTTP testing library — wraps Express app, returns chainable request builder."],
    ["jest.mock()",     "Auto-mocks a module so every export becomes a jest.fn(). Used to neutralise repositories & DB."],
    ["truncate vs drop","Truncate is much faster than DROP+CREATE; we use it between each integration/E2E test."],
    ["State machine",   "Order status transitions enforced explicitly in OrderService.updateOrderStatus()."],
    ["Test pyramid",    "Convention where unit tests outnumber integration tests, which outnumber E2E tests."],
]);

drawChromeOnAllPages();
doc.end();
console.log(`Wrote ${OUTPUT} — ${pageNum} pages`);
