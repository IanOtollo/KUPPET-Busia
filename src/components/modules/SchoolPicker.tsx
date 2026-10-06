"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { Check, Plus, Search } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type School = { _id: string; name: string; subCounty: string; isActive: boolean };

/** "Okwata Junior Secondary School" and "okwata junior" count as the same name. */
const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(secondary|school|sec|sch)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");

function distance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
      last = tmp;
    }
  }
  return prev[b.length];
}

/**
 * A search box over the branch's school directory. Teachers pick their school
 * from the list, which keeps one spelling per school. If the school really isn't
 * there, one clear option adds it.
 */
export function SchoolPicker({
  id = "school",
  value,
  onChange,
  onPick,
  error,
  placeholder = "Search for your school…",
}: {
  id?: string;
  value: string;
  onChange: (name: string) => void;
  /** Called when an existing school is chosen (e.g. to fill in the sub-county). */
  onPick?: (school: { name: string; subCounty: string }) => void;
  error?: boolean;
  placeholder?: string;
}) {
  const schools = (useQuery(api.schools.list) ?? []) as School[];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const query = value.trim();
  const key = normalise(query);

  const { matches, exact } = useMemo(() => {
    const live = schools.filter((s) => s.isActive);
    if (!key) return { matches: live.slice(0, 6), exact: null as School | null };
    const scored = live
      .map((s) => {
        const n = normalise(s.name);
        let score = 99;
        if (n === key) score = 0;
        else if (n.startsWith(key)) score = 1;
        else if (n.includes(key)) score = 2;
        else if (key.length >= 5 && distance(n, key) <= 2) score = 3; // typo tolerance
        return { s, score };
      })
      .filter((x) => x.score < 99)
      .sort((a, b) => a.score - b.score || a.s.name.localeCompare(b.s.name));
    return { matches: scored.slice(0, 6).map((x) => x.s), exact: scored.find((x) => x.score === 0)?.s ?? null };
  }, [schools, key]);

  const showAdd = query.length >= 3 && !exact;
  const rows = [...matches.map((s) => ({ type: "school" as const, s })), ...(showAdd ? [{ type: "add" as const }] : [])];

  const choose = (row: (typeof rows)[number]) => {
    if (row.type === "school") {
      onChange(row.s.name);
      onPick?.({ name: row.s.name, subCounty: row.s.subCounty });
    }
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && rows[active]) {
      e.preventDefault();
      choose(rows[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={boxRef}
      className="relative"
      onBlur={(e) => {
        if (!boxRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--ink-muted)]" />
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          className="pl-11"
          placeholder={placeholder}
          error={error}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && rows.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--shadow-panel)]"
        >
          {rows.map((row, i) => (
            <li
              key={row.type === "school" ? row.s._id : "add"}
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(row)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-[var(--r-sm)] px-3 py-3 text-[16px]",
                i === active ? "bg-[var(--union-soft)]" : "",
                row.type === "add" && "border-t border-[var(--line)] text-[var(--union)]"
              )}
            >
              {row.type === "school" ? (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[var(--ink)]">{row.s.name}</span>
                    <span className="block text-[14px] text-[var(--ink-muted)]">{row.s.subCounty}</span>
                  </span>
                  {exact?._id === row.s._id && <Check className="h-5 w-5 shrink-0 text-[var(--success)]" />}
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 shrink-0" />
                  <span className="min-w-0">
                    My school isn&apos;t listed: add <strong className="break-words">&ldquo;{query}&rdquo;</strong>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {query.length >= 3 && !open && (
        <p className={cn("mt-2 text-[15px]", exact ? "text-[var(--success)]" : "text-[var(--ink-muted)]")}>
          {exact
            ? "Found in the branch directory."
            : "Not in the directory yet. It will be added when you finish signing up."}
        </p>
      )}
    </div>
  );
}
