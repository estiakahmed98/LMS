"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

interface ActivityFilterTypeaheadProps<T> {
  placeholder: string;
  allLabel: string;
  selectedLabel: string | null;
  fetchOptions: (search: string) => Promise<T[]>;
  getKey: (option: T) => string;
  getLabel: (option: T) => string;
  onSelect: (option: T | null) => void;
  className?: string;
}

/**
 * A searchable dropdown backed by a server typeahead endpoint instead of a
 * pre-loaded option list — the filter option set can run into the thousands
 * (every distinct actor/action/entity ever logged), so this only ever
 * fetches a bounded, debounced page of matches instead of everything.
 */
export default function ActivityFilterTypeahead<T>({
  placeholder,
  allLabel,
  selectedLabel,
  fetchOptions,
  getKey,
  getLabel,
  onSelect,
  className = "",
}: ActivityFilterTypeaheadProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(() => {
      void fetchOptions(query)
        .then((results) => {
          if (!cancelled) setOptions(results);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [open, query, fetchOptions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm"
      >
        <span className={selectedLabel ? "truncate text-foreground" : "truncate text-muted-foreground"}>
          {selectedLabel ?? allLabel}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {selectedLabel && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.stopPropagation();
                  onSelect(null);
                }
              }}
              aria-label="Clear"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-t-lg border-b border-border bg-transparent px-3 py-2 text-sm outline-none"
          />
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
            >
              {allLabel}
            </button>
            {loading ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>
            ) : options.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No matches.</p>
            ) : (
              options.map((option) => (
                <button
                  key={getKey(option)}
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="truncate">{getLabel(option)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
