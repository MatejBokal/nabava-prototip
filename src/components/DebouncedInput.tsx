import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/useDebouncedUpdate';
import { X } from 'lucide-react';

interface DebouncedInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: string | number;
  onDebouncedChange: (value: string) => void;
  debounceMs?: number;
  /** Show a small clear (x) button when the field has a value */
  showClear?: boolean;
  /** Enter moves focus to the next field carrying data-qty-input */
  enterMovesNext?: boolean;
}

export function DebouncedInput({
  value,
  onDebouncedChange,
  debounceMs = 250,
  showClear = false,
  enterMovesNext = false,
  className,
  ...props
}: DebouncedInputProps) {
  const focusedRef = useRef(false);
  const [, force] = useState(0);
  const [local, setLocal, flush] = useDebouncedValue(
    value,
    (v) => onDebouncedChange(String(v ?? '')),
    debounceMs,
    () => focusedRef.current,
  );


  const focusNext = (el: HTMLInputElement) => {
    const all = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-qty-input]'));
    const idx = all.indexOf(el);
    const next = all[idx + 1];
    if (next) {
      next.focus();
      next.select();
    } else {
      el.blur();
    }
  };

  const hasValue = local !== null && local !== undefined && String(local) !== '';

  return (
    <div className="relative">
      <Input
        {...props}
        data-qty-input={enterMovesNext ? '' : undefined}
        className={`${className ?? ''} ${showClear && hasValue ? 'pr-6' : ''}`}
        value={local ?? ''}
        onFocus={e => { focusedRef.current = true; e.currentTarget.select(); }}
        onBlur={() => { focusedRef.current = false; flush(); force(n => n + 1); }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            flush();
            if (enterMovesNext) focusNext(e.currentTarget);
            else e.currentTarget.blur();
          }
        }}

        onChange={e => setLocal(e.target.value)}
      />
      {showClear && hasValue && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Počisti"
          onClick={() => setLocal('')}
          className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground/70 hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
