"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A `<select>` stand-in with a text filter, for lists too long to scan by eye
 * (e.g. picking one member out of the whole club). Submits like a normal
 * select via a hidden `name`-ed input — the visible text field is just for
 * searching/display, not itself part of the form data.
 *
 * To clear the selection (e.g. after a successful submit), remount it by
 * changing its `key` from the parent — the standard React pattern for
 * resetting a controlled component's state from outside.
 */
export function SearchableSelect({
  name,
  options,
  placeholder = "Suchen…",
  required = false,
}: {
  name: string;
  options: { id: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.id === selectedId)?.label ?? "";
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={containerRef} className="relative">
      <input
        id={`${name}-search`}
        type="text"
        autoComplete="off"
        required={required}
        value={selectedId ? selectedLabel : query}
        onChange={(e) => {
          setSelectedId("");
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
      />
      <input type="hidden" name={name} value={selectedId} />
      {open && (query || !selectedId) && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-white text-sm shadow-lg">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-muted">Keine Treffer.</li>
          )}
          {filtered.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(o.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-page-bg"
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
