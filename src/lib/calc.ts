/** Evaluate a simple arithmetic expression like "3*6+2" (supports + - * x × / and parentheses, comma decimals). Returns null if invalid. */
export function evalExpression(input: string): number | null {
  const src = input.replace(/\s+/g, '').replace(/[x×X]/g, '*').replace(/[÷:]/g, '/').replace(/,/g, '.');
  if (!src) return null;
  if (!/^[0-9.+\-*/()]+$/.test(src)) return null;
  let pos = 0;
  const peek = () => src[pos];
  const parseNumber = (): number => {
    const m = /^\d*\.?\d+|^\d+\.?/.exec(src.slice(pos));
    if (!m) throw new Error('num');
    pos += m[0].length;
    return parseFloat(m[0]);
  };
  const parseFactor = (): number => {
    if (peek() === '-') { pos++; return -parseFactor(); }
    if (peek() === '+') { pos++; return parseFactor(); }
    if (peek() === '(') {
      pos++;
      const v = parseExpr();
      if (peek() !== ')') throw new Error('paren');
      pos++;
      return v;
    }
    return parseNumber();
  };
  const parseTerm = (): number => {
    let v = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = src[pos++];
      const r = parseFactor();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const parseExpr = (): number => {
    let v = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = src[pos++];
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  try {
    const v = parseExpr();
    if (pos !== src.length || !Number.isFinite(v)) return null;
    return Math.round(v * 100) / 100;
  } catch {
    return null;
  }
}
