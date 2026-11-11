import { useState, useEffect, useRef, useCallback } from 'react';

/** Flush functions of all inputs that currently have an unsaved (debounced) value. */
const pendingFlushes = new Set<() => void>();

/** Immediately save every pending debounced input (e.g. before sending an order). */
export function flushAllPending() {
  for (const flush of Array.from(pendingFlushes)) flush();
}

/**
 * Returns a local value + setter that debounces calls to the async save function.
 * The input stays responsive because we update local state immediately.
 */
export function useDebouncedValue(
  externalValue: string | number | null,
  onSave: (value: string | number | null) => void,
  delay = 250,
  isFocused?: () => boolean,
) {
  const [local, setLocal] = useState(externalValue);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pendingValue = useRef<string | number | null>(null);
  const hasPending = useRef(false);
  const latestSave = useRef(onSave);
  latestSave.current = onSave;
  const focusedRef = useRef(isFocused);
  focusedRef.current = isFocused;

  // Sync from external only when it truly changes (e.g. realtime update from another user)
  const lastSaved = useRef(externalValue);
  useEffect(() => {
    // Never overwrite what the user is currently typing, or a value waiting to be saved
    if (focusedRef.current?.() || hasPending.current) {
      lastSaved.current = externalValue;
      return;
    }
    // Only accept external updates if they differ from what we last saved
    if (externalValue !== lastSaved.current) {
      setLocal(externalValue);
      lastSaved.current = externalValue;
    }
  }, [externalValue]);

  const flush = useCallback(() => {
    if (!hasPending.current) return;
    if (timer.current) clearTimeout(timer.current);
    hasPending.current = false;
    pendingFlushes.delete(flushRef.current!);
    lastSaved.current = pendingValue.current;
    latestSave.current(pendingValue.current);
  }, []);

  const flushRef = useRef<() => void>();
  flushRef.current = flush;

  const update = useCallback((value: string | number | null) => {
    setLocal(value);
    pendingValue.current = value;
    hasPending.current = true;
    pendingFlushes.add(flushRef.current!);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current!(), delay);
  }, [delay]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (flushRef.current) pendingFlushes.delete(flushRef.current);
  }, []);

  return [local, update, flush] as const;
}
