import { useEffect, useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { materials } from "../lib/categoryVisuals";

export default function ContextMenu({
  x,
  y,
  folderId,
  currentLabel,
  currentMaterialKey,
  onClose,
  onColorChange,
  onRename,
  onReset,
  onDelete,
  onSetRule,
  currentCategory = "",
}) {
  const menuRef = useRef(null);
  const [label, setLabel] = useState(currentLabel);
  const [category, setCategory] = useState(currentCategory);
  const entries = Object.entries(materials);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{ left: Math.min(x, window.innerWidth - 300), top: Math.min(y, window.innerHeight - 400) }}
      className="fixed z-[100] min-w-[280px] rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl"
    >
      {/* Color swatch grid */}
      <div className="mb-3">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/36">
          Change color
        </div>
        <div className="grid grid-cols-5 gap-2">
          {entries.map(([key, mat]) => {
            const selected = key === currentMaterialKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onColorChange(folderId, key)}
                title={mat.material}
                className={`h-7 w-7 rounded-full border-2 transition hover:scale-110 ${
                  selected ? "border-white shadow-lg shadow-white/20" : "border-transparent"
                }`}
                style={{ background: mat.gradient }}
              >
                {selected && <Check className="m-auto h-3.5 w-3.5 text-white drop-shadow" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rename input */}
      <div className="mb-2">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/36">
          Rename
        </div>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label !== currentLabel && onRename(folderId, label)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              label !== currentLabel && onRename(folderId, label);
              e.currentTarget.blur();
            }
          }}
          className="w-full rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm font-semibold text-white placeholder:text-white/30 focus:border-sky-300/40 focus:outline-none"
          placeholder="Folder name"
        />
      </div>

      {/* Auto-file rule (custom boxes only) */}
      {onSetRule && (
        <div className="mb-2">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/36">
            Auto-file category
          </div>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onBlur={() => category !== currentCategory && onSetRule(folderId, category)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSetRule(folderId, category);
                e.currentTarget.blur();
              }
            }}
            className="w-full rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm font-semibold text-white placeholder:text-white/30 focus:border-sky-300/40 focus:outline-none"
            placeholder="e.g. fantasy-football"
          />
        </div>
      )}

      {/* Reset */}
      <button
        type="button"
        onClick={() => onReset(folderId)}
        className="text-xs font-medium text-white/40 transition hover:text-white/70"
      >
        Reset to default
      </button>

      {/* Delete (custom boxes only) */}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(folderId)}
          className="mt-2 flex w-full items-center gap-1.5 border-t border-white/8 pt-2 text-xs font-semibold text-rose-300/70 transition hover:text-rose-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete this box
        </button>
      )}
    </div>
  );
}
