// Fast drop-in for csv-reader 1.0.0, written from the reference policy in RULES.txt.
// Same answers as the reference on every input, but fields are taken with
// a single left-to-right scan and slice at each delimiter, instead of one
// character at a time with string concatenation. Quoted fields are taken
// as whole slices unless they hold a doubled quote or a line break inside.
// A per-field indexOf version and a per-record split version were both
// tested on the practice set and were slower than this scan, so they were
// not kept. No dependencies, no clock, no randomness, nothing kept from
// one call to the next.
export function run(input) {
  const text = typeof input.text === 'string' ? input.text : String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  const n = text.length;
  let pos = 0;
  let line = 1;
  if (n > 0 && text.charCodeAt(0) === 0xFEFF) pos = 1;

  // Rare path: read an unquoted field a character at a time, exactly as the
  // reference does. Used only for stray CRs, quote junk and unterminated quotes.
  // rl/rr are the record's line and row, used for every error this field makes.
  function readUnquotedSlow(initial, rl, rr) {
    let value = initial;
    let added = 0;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 44) { pos++; return [value, 0, added]; }
      if (c === 10) { pos++; line++; return [value, 1, added]; }
      if (c === 13) {
        if (pos + 1 < n && text.charCodeAt(pos + 1) === 10) { pos += 2; line++; return [value, 1, added]; }
        errors.push({ code: 'stray_cr', line: rl, row: rr });
        pos++;
        continue;
      }
      value += text[pos];
      added++;
      pos++;
    }
    return [value, 2, added];
  }

  // Append text[start:end] to parts, turning every CRLF or lone CR inside it
  // into one LF and counting every line break it holds. Only called for quoted
  // segments that actually hold a CR or an LF.
  function pushSeg(start, end, parts) {
    const cr = text.indexOf('\r', start);
    if (cr !== -1 && cr < end) {
      let s = start;
      let i = start;
      while (i < end) {
        const cc = text.charCodeAt(i);
        if (cc === 13) {
          if (i > s) parts.push(text.slice(s, i));
          parts.push('\n');
          line++;
          i += (i + 1 < end && text.charCodeAt(i + 1) === 10) ? 2 : 1;
          s = i;
          continue;
        }
        if (cc === 10) line++;
        i++;
      }
      if (s < end) parts.push(text.slice(s, end));
      return;
    }
    let nl = text.indexOf('\n', start);
    if (nl !== -1 && nl < end) {
      let cnt = 0;
      let p = start;
      while (true) {
        const x = text.indexOf('\n', p);
        if (x === -1 || x >= end) break;
        cnt++;
        p = x + 1;
      }
      line += cnt;
    }
    parts.push(text.slice(start, end));
  }

  while (true) {
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) { pos++; line++; }
      else if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) { pos += 2; line++; }
      else break;
    }
    if (pos >= n) break;

    const recordLine = line;
    const recordRow = (header && columns === null) ? null : rows.length;
    const fields = [];
    let ended = 2;
    let lastQuoted = false;

    do {
      const fieldStart = pos;
      lastQuoted = text.charCodeAt(pos) === 34;
      let value;
      if (lastQuoted) {
        const open = pos;
        const openLine = line;
        let segStart = pos + 1;
        pos = segStart;
        let parts = null;
        let closed = false;
        let closePos = -1;
        while (true) {
          const q = text.indexOf('"', pos);
          if (q === -1) {
            pos = open + 1;
            line = openLine;
            errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
            const r = readUnquotedSlow('"', recordLine, recordRow);
            value = r[0];
            ended = r[1];
            break;
          }
          if (q + 1 < n && text.charCodeAt(q + 1) === 34) {
            if (parts === null) parts = [];
            pushSeg(segStart, q + 1, parts);
            pos = q + 2;
            segStart = pos;
            continue;
          }
          if (parts === null) {
            const cr = text.indexOf('\r', segStart);
            const nl = text.indexOf('\n', segStart);
            if ((cr === -1 || cr >= q) && (nl === -1 || nl >= q)) {
              value = text.slice(segStart, q);
            } else {
              parts = [];
              pushSeg(segStart, q, parts);
              value = parts.join('');
            }
          } else {
            pushSeg(segStart, q, parts);
            value = parts.join('');
          }
          closePos = q;
          closed = true;
          break;
        }
        if (closed) {
          if (closePos + 1 >= n) { pos = n; ended = 2; }
          else {
            const c = text.charCodeAt(closePos + 1);
            if (c === 44) { pos = closePos + 2; ended = 0; }
            else if (c === 10) { pos = closePos + 2; line++; ended = 1; }
            else if (c === 13 && closePos + 2 < n && text.charCodeAt(closePos + 2) === 10) { pos = closePos + 3; line++; ended = 1; }
            else {
              pos = closePos + 1;
              const r = readUnquotedSlow(value, recordLine, recordRow);
              if (r[2] > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
              value = r[0];
              ended = r[1];
            }
          }
        }
      } else {
        let i = pos;
        while (i < n) {
          const cc = text.charCodeAt(i);
          if (cc === 44 || cc === 10 || cc === 13) break;
          i++;
        }
        if (i >= n) { value = text.slice(pos); pos = n; ended = 2; }
        else {
          const cc = text.charCodeAt(i);
          if (cc === 44) { value = text.slice(pos, i); pos = i + 1; ended = 0; }
          else if (cc === 10) { value = text.slice(pos, i); pos = i + 1; line++; ended = 1; }
          else if (i + 1 < n && text.charCodeAt(i + 1) === 10) { value = text.slice(pos, i); pos = i + 2; line++; ended = 1; }
          else {
            const r = readUnquotedSlow('', recordLine, recordRow);
            value = r[0];
            ended = r[1];
          }
        }
      }
      fields.push(value);
    } while (ended === 0);

    if (fields.length === 1 && fields[0] === '' && !lastQuoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
