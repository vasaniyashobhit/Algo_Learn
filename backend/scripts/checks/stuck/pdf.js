const LINE_HEIGHT = 14;
const MARGIN = 40;

// PDF string literals: escape backslash and parentheses; keep Latin-1 only.
const escapePdf = (text) => text.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, '?');

/** A small valid PDF (Helvetica 11 pt, one line per entry) that unpdf can read. */
export const makePdf = (lines) => {
  const list = [lines].flat();
  const height = MARGIN * 2 + list.length * LINE_HEIGHT;
  const body = list.map((line) => `(${escapePdf(line)}) Tj T*`).join('\n');
  const stream = `BT /F1 11 Tf ${LINE_HEIGHT} TL ${MARGIN} ${height - MARGIN} Td\n${body}\nET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = objects.map((object, i) => {
    const at = out.length;
    out += `${i + 1} 0 obj\n${object}\nendobj\n`;
    return at;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((at) => `${String(at).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
};

/** Word-wraps text into lines of at most `width` characters. */
export const wrap = (text, width) => text.split('\n').flatMap((paragraph) => {
  const lines = [];
  let line = '';
  for (const word of paragraph.split(/\s+/).filter(Boolean)) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  return [...lines, line];
});
