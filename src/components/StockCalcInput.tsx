import { useEffect, useState } from 'react';
import { evalExpression } from '@/lib/calc';

interface Props {
  value: number | null;
  onCommit: (value: number | null) => void;
}

/** Stock field with a mini calculator: type "3*6+2", Enter/blur stores the result. */
export function StockCalcInput({ value, onCommit }: Props) {
  const [draft, setDraft] = useState(value !== null ? String(value) : '');
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(value !== null ? String(value) : '');
  }, [value, focused]);

  const commit = () => {
    const t = draft.trim();
    if (t === '') { setInvalid(false); if (value !== null) onCommit(null); return true; }
    const r = evalExpression(t);
    if (r === null) { setInvalid(true); return false; }
    setInvalid(false);
    const v = Math.max(0, r);
    setDraft(String(v));
    if (v !== value) onCommit(v);
    return true;
  };

  const focusNext = (el: HTMLInputElement) => {
    const all = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-stock-input]'));
    const next = all[all.indexOf(el) + 1];
    if (next) { next.focus(); next.select(); } else el.blur();
  };

  const preview = focused && /[+\-*/x×]/i.test(draft.replace(/^-/, '')) ? evalExpression(draft) : null;

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="tel"
        data-stock-input=""
        value={draft}
        placeholder="zal."
        aria-label="Stanje zaloge"
        onFocus={e => { setFocused(true); e.currentTarget.select(); }}
        onBlur={() => { setFocused(false); commit(); }}
        onChange={e => { setDraft(e.target.value); setInvalid(false); }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (commit()) focusNext(e.currentTarget);
          }
        }}
        className={`h-8 w-full rounded-md border bg-background px-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-ring ${invalid ? 'border-destructive' : 'border-input'}`}
      />
      {preview !== null && (
        <span className="absolute -top-4 right-0 text-[10px] font-semibold text-primary bg-background px-1 rounded">= {preview}</span>
      )}
    </div>
  );
}
