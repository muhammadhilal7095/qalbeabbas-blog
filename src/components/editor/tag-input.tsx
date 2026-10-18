"use client";
import * as React from "react";
import { Plus, X } from "lucide-react";
import { inputClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type TagValue = { id?: string; name: string };

/** Multi-select tag picker with type-ahead; unknown names become new tags on save. */
export function TagInput({ value, onChange, options }: { value: TagValue[]; onChange: (v: TagValue[]) => void; options: { id: string; name: string }[] }) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const chosen = new Set(value.map((v) => v.name.toLowerCase()));
  const matches = options.filter((o) => !chosen.has(o.name.toLowerCase()) && o.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8);
  const exact = options.some((o) => o.name.toLowerCase() === q.trim().toLowerCase());
  const suggestions: TagValue[] = [...matches, ...(q.trim() && !exact && !chosen.has(q.trim().toLowerCase()) ? [{ name: q.trim() }] : [])];

  const add = (t: TagValue) => {
    if (!t.name.trim() || chosen.has(t.name.toLowerCase())) return;
    onChange([...value, t]);
    setQ(""); setActive(0);
  };

  return (
    <div className="relative">
      <div className={cn(inputClasses, "flex h-auto min-h-9 flex-wrap items-center gap-1.5 py-1.5")}>
        {value.map((t) => (
          <span key={t.name} className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
            {t.name}{!t.id && <span className="text-[10px] opacity-70">(new)</span>}
            <button type="button" onClick={() => onChange(value.filter((v) => v.name !== t.name))} aria-label={`Remove tag ${t.name}`} className="rounded hover:bg-primary/10"><X className="size-3" /></button>
          </span>
        ))}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (suggestions[active]) add(suggestions[active]); else if (q.trim()) add({ name: q.trim() }); }
            else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Backspace" && !q && value.length) onChange(value.slice(0, -1));
          }}
          placeholder={value.length ? "" : "Add tags…"}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none"
          aria-label="Add tag"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-autocomplete="list"
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-white p-1 shadow-pop" role="listbox">
          {suggestions.map((s, i) => (
            <li key={s.id ?? `new-${s.name}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); add(s); }} onMouseEnter={() => setActive(i)}
                className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm", i === active && "bg-surface")}>
                {!s.id && <Plus className="size-3.5 text-primary" />}{s.id ? s.name : <>Create “{s.name}”</>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
