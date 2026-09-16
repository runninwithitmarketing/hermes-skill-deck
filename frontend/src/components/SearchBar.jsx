import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";

export default function SearchBar({ value, onChange, compact = false }) {
  const inputRef = useRef(null);
  const hasText = Boolean(value);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function clear() {
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <label
      className={`flex items-center gap-3 rounded-3xl border border-white/10 bg-black/35 px-5 text-white shadow-glass backdrop-blur-2xl transition focus-within:border-sky-300/40 ${
        compact ? "h-12" : "h-16"
      }`}
    >
      <Search className="h-5 w-5 shrink-0 text-white/55" />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && hasText) clear();
        }}
        placeholder="Search skills…"
        className="min-w-0 flex-1 bg-transparent font-ui text-base font-medium text-white placeholder:text-white/42 focus:outline-none"
      />
      {hasText ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            clear();
          }}
          title="Clear search"
          aria-label="Clear search"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      ) : (
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-ui text-xs font-semibold text-white/55">
          ⌘K
        </span>
      )}
    </label>
  );
}
