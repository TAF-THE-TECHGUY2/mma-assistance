/**
 * Branded print/PDF rendering for the MMA management registers.
 *
 * Opens a clean standalone window containing the register laid out like the
 * company's Excel sheets (logo, company name, Reg No, title bar, bordered
 * table) and triggers the browser print dialog — from which the user can print
 * or "Save as PDF". No backend or extra dependencies required.
 *
 * The logo is loaded from /mma-logo.png (place the file in frontend/public);
 * if it's missing the header gracefully falls back to text only.
 */

const COMPANY = 'Meridian Medical Assistance (Pty) Ltd';
const REG_NO = 'Reg No: 2009/024614/07';
const LOGO_PATH = '/mma-logo.png';

export interface PrintColumn<T = unknown> {
  header: string;
  value: (row: T) => string;
}

export interface PrintRegisterOptions<T = unknown> {
  /** Title bar text, e.g. "IN PATIENT MANAGEMENT REGISTER". */
  title: string;
  /** Optional line under the title, e.g. a date. */
  subtitle?: string;
  columns: PrintColumn<T>[];
  rows: T[];
  orientation?: 'portrait' | 'landscape';
  /** Pad with blank rows up to this count (mirrors the printed Excel sheets). */
  minRows?: number;
}

function esc(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c,
  );
}

export function printRegister<T>(opts: PrintRegisterOptions<T>): void {
  const orientation = opts.orientation ?? 'landscape';
  const cols = opts.columns;
  const origin = window.location.origin;

  const headCells = cols.map((c) => `<th>${esc(c.header)}</th>`).join('');
  const bodyRows = opts.rows
    .map(
      (r) =>
        `<tr>${cols.map((c) => `<td>${esc(c.value(r))}</td>`).join('')}</tr>`,
    )
    .join('');

  const padCount = Math.max(0, (opts.minRows ?? 0) - opts.rows.length);
  const padRows = Array.from(
    { length: padCount },
    () => `<tr>${cols.map(() => '<td>&nbsp;</td>').join('')}</tr>`,
  ).join('');

  const generated = new Date().toLocaleString();

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(opts.title)}</title>
<style>
  @page { size: A4 ${orientation}; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Georgia, serif; color:#000; margin:0; }
  .hdr { display:flex; align-items:center; gap:18px; margin-bottom:6px; }
  .hdr img { height:78px; width:auto; object-fit:contain; }
  .hdr .co { flex:1; text-align:center; }
  .co .name { color:#9a7d2e; font-size:22px; font-weight:bold; }
  .co .reg { color:#9a7d2e; font-size:12px; margin-top:2px; }
  .hdr .spacer { width:90px; }
  .title { text-align:center; font-weight:bold; font-size:13px; background:#ededed;
           border:1px solid #999; padding:5px; margin:6px 0 10px; letter-spacing:1px; }
  .sub { font-size:12px; margin:0 0 8px; }
  table { width:100%; border-collapse:collapse; font-size:10px; }
  th, td { border:1px solid #000; padding:3px 5px; text-align:left; vertical-align:top; }
  th { background:#d9d9d9; font-weight:bold; }
  tbody tr { height:22px; }
  .meta { text-align:right; font-size:9px; color:#666; margin-top:8px; }
  @media print { .noprint { display:none; } }
</style>
</head>
<body>
  <div class="hdr">
    <img src="${origin}${LOGO_PATH}" alt="" onerror="this.style.display='none'" />
    <div class="co">
      <div class="name">${esc(COMPANY)}</div>
      <div class="reg">${esc(REG_NO)}</div>
    </div>
    <div class="spacer"></div>
  </div>
  <div class="title">${esc(opts.title)}</div>
  ${opts.subtitle ? `<div class="sub">${esc(opts.subtitle)}</div>` : ''}
  <table>
    <thead><tr>${headCells}</tr></thead>
    <tbody>${bodyRows}${padRows}</tbody>
  </table>
  <div class="meta">Generated ${esc(generated)} &middot; ${opts.rows.length} record(s)</div>
  <script>
    window.onload = function () { setTimeout(function () { window.print(); }, 300); };
    window.onafterprint = function () { window.close(); };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1180,height=820');
  if (!win) {
    alert('Please allow pop-ups for this site to print the register.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
