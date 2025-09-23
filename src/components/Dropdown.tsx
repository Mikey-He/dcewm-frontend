// src/components/Dropdown.tsx
import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface DropdownProps {
  value: string | string[];
  onChange: (v: string | string[]) => void;
  options: string[];
  placeholder?: string;
  searchable?: boolean;
  multiple?: boolean;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchable = true,
  multiple = false,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  // Match panel width to trigger and pin under it (fixes offset)
  useEffect(() => {
    if (open && rootRef.current && panelRef.current) {
      const w = rootRef.current.getBoundingClientRect().width;
      panelRef.current.style.width = `${w}px`;
    }
  }, [open]);

  const toggleValue = (v: string) => {
    if (multiple) {
      const s = new Set(selected);
      s.has(v) ? s.delete(v) : s.add(v);
      onChange(Array.from(s));
    } else {
      onChange(v);
      setOpen(false);
    }
  };

  const removeTag = (v: string) => onChange(selected.filter((x) => x !== v));

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* trigger */}
      <div
        className="w-full min-h-[40px] rounded-md border border-gray-300 bg-white px-3 py-2 flex items-center flex-wrap gap-2 cursor-text"
        onClick={() => setOpen((o) => !o)}
      >
        {multiple && selected.length > 0 ? (
          selected.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 text-xs bg-gray-100 border border-gray-200 rounded px-2 py-1"
            >
              {v}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(v);
                }}
                className="p-0.5 hover:text-red-600"
              >
                <X size={12} />
              </button>
            </span>
          ))
        ) : (
          <span className={`text-sm ${selected[0] ? "text-gray-900" : "text-gray-500"}`}>
            {selected[0] || placeholder}
          </span>
        )}
      </div>

      {/* panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-auto"
        >
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none"
              />
            </div>
          )}
          <div className="py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No options</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleValue(opt)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  {multiple && (
                    <input type="checkbox" readOnly checked={selected.includes(opt)} className="pointer-events-none" />
                  )}
                  <span>{opt}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
