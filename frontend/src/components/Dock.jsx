import { useEffect, useRef, useState } from "react";
import {
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Code2,
  FlaskConical,
  Grid3X3,
  Home,
  Music,
  Send,
  Sparkles,
  TerminalSquare,
  UserCheck,
  Video,
} from "lucide-react";

const fixedItems = [
  { label: "Home", short: "Home", icon: Home, action: "home", color: "text-sky-600" },
  { label: "All Skills", short: "All", icon: Grid3X3, action: "all", color: "text-indigo-600" },
];

// Known profiles get a hand-picked icon + color + a short dock label. Anything
// new (synced from ~/.hermes/profiles at runtime) falls back to a deterministic
// palette pick so every profile is reachable from the Dock without a code change.
const PROFILE_META = {
  default: { label: "Default", short: "Default", icon: UserCheck, color: "text-emerald-600" },
  stock: { label: "Stock", short: "Stock", icon: Cloud, color: "text-amber-600" },
  qa: { label: "QA", short: "QA", icon: FlaskConical, color: "text-rose-600" },
  dj: { label: "DJ", short: "DJ", icon: Music, color: "text-violet-600" },
  hm: { label: "HM", short: "HM", icon: Code2, color: "text-cyan-600" },
  cooperskitchen: { label: "Cooper's Kitchen", short: "Cooper's", icon: ChefHat, color: "text-orange-600" },
  fantasy: { label: "Fantasy", short: "Fantasy", icon: Sparkles, color: "text-fuchsia-600" },
  outreach: { label: "Outreach", short: "Outreach", icon: Send, color: "text-teal-600" },
  video: { label: "Video", short: "Video", icon: Video, color: "text-red-600" },
};

const FALLBACK_COLORS = [
  "text-emerald-600",
  "text-amber-600",
  "text-rose-600",
  "text-violet-600",
  "text-cyan-600",
  "text-sky-600",
  "text-teal-600",
  "text-fuchsia-600",
];

function profileMeta(id) {
  if (PROFILE_META[id]) return PROFILE_META[id];
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const label = id.charAt(0).toUpperCase() + id.slice(1);
  return { label, short: label, icon: UserCheck, color: FALLBACK_COLORS[hash % FALLBACK_COLORS.length] };
}

const TILE_CLASS =
  "group relative flex h-[4.25rem] w-14 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border shadow-lg transition hover:-translate-y-1 hover:bg-white";
const TILE_IDLE_CLASS = "border-white/20 bg-white/90";
const TILE_ACTIVE_CLASS =
  "border-sky-400/70 bg-white ring-2 ring-sky-400/80 ring-offset-2 ring-offset-black/40";

function TileLabel({ children }) {
  return (
    <span className="max-w-[3.25rem] truncate text-[10px] font-semibold leading-none text-slate-500">
      {children}
    </span>
  );
}

export default function Dock({ onAction, onProfile, onTerminal, onReorderProfiles, profiles = [], selectedProfile = null }) {
  // The profile strip scrolls horizontally when it overflows; the chevrons
  // appear only then and disable themselves at either edge.
  const stripRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  // ── Profile tile reordering (pointer events — HTML5 DnD is unreliable in
  // the macOS WKWebView). Same threshold+follow+hit-test pattern as the
  // folder grid, persisted by App via onReorderProfiles. ──
  const [dragId, setDragId] = useState(null);
  const [dropId, setDropId] = useState(null);
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const pressRef = useRef(null);
  const dropRef = useRef(null);
  const suppressClickRef = useRef(false);
  const canReorder = Boolean(onReorderProfiles);

  const updateEdges = () => {
    const el = stripRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  };

  useEffect(() => {
    updateEdges();
    const el = stripRef.current;
    if (!el) return undefined;
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [profiles]);

  const scrollStrip = (direction) => {
    stripRef.current?.scrollBy({ left: direction * 180, behavior: "smooth" });
  };

  const endDrag = (commit) => {
    const st = pressRef.current;
    pressRef.current = null;
    if (st?.engaged && commit && dropRef.current && dropRef.current !== st.id) {
      const ids = profiles.map((p) => p.profile);
      const from = ids.indexOf(st.id);
      const to = ids.indexOf(dropRef.current);
      if (from !== -1 && to !== -1) {
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        onReorderProfiles(ids);
      }
    }
    if (st?.engaged) suppressClickRef.current = true;
    setDragId(null);
    setDropId(null);
    dropRef.current = null;
    setDragDelta({ x: 0, y: 0 });
  };

  const handlePointerDown = (e, profileId) => {
    if (e.button !== 0 || !canReorder) return;
    pressRef.current = { id: profileId, startX: e.clientX, startY: e.clientY, engaged: false };
  };

  const handlePointerMove = (e) => {
    const st = pressRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.engaged && Math.hypot(dx, dy) > 6) {
      st.engaged = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // capture needs an active pointer (synthetic events) — real drags have one
      }
      setDragId(st.id);
    }
    if (!st.engaged) return;
    setDragDelta({ x: dx, y: dy });
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const target = hit?.closest("[data-profile-id]");
    const tid = target && target.dataset.profileId !== st.id ? target.dataset.profileId : null;
    dropRef.current = tid;
    setDropId((cur) => (cur === tid ? cur : tid));
  };

  return (
    <nav className="mac-dock fixed bottom-4 left-1/2 z-40 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-[2rem] border border-white/15 bg-black/40 px-3 py-2.5 shadow-glass backdrop-blur-2xl">
      <div className="flex items-center gap-2.5">
        {fixedItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.label}
              title={item.label}
              onClick={() => onAction(item.action)}
              className={`${TILE_CLASS} ${TILE_IDLE_CLASS}`}
            >
              <Icon className={`h-6 w-6 ${item.color}`} />
              <TileLabel>{item.short}</TileLabel>
            </button>
          );
        })}

        <button
          type="button"
          title="Terminal"
          onClick={onTerminal}
          className={`${TILE_CLASS} ${TILE_IDLE_CLASS}`}
        >
          <TerminalSquare className="h-6 w-6 text-slate-700" />
          <TileLabel>Terminal</TileLabel>
        </button>

        <span className="mx-1 h-14 w-px shrink-0 bg-white/20" />

        {edges.left && (
          <button
            type="button"
            title="Scroll profiles left"
            onClick={() => scrollStrip(-1)}
            className="flex h-12 w-6 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Vertical padding gives the overflow-x strip room for the hover lift,
            the active ring offset, and the active dot — otherwise overflow-y
            (implied auto by overflow-x) clips them at the top. */}
        <div
          ref={stripRef}
          className="-my-3 flex items-center gap-2.5 overflow-x-auto scroll-smooth py-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {profiles.map((item) => {
            const meta = profileMeta(item.profile);
            const Icon = meta.icon;
            const active = item.profile === selectedProfile;
            const countSuffix = typeof item.count === "number" ? ` — ${item.count} skills` : "";
            const dragging = dragId === item.profile;
            return (
              <button
                type="button"
                key={item.profile}
                data-profile-id={item.profile}
                title={
                  active
                    ? `Clear ${meta.label} filter${countSuffix}${canReorder ? " • drag to reorder" : ""}`
                    : `${meta.label}${countSuffix}${canReorder ? " • drag to reorder" : ""}`
                }
                onClick={() => onProfile(item.profile)}
                onClickCapture={(e) => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onPointerDown={(e) => handlePointerDown(e, item.profile)}
                onPointerMove={handlePointerMove}
                onPointerUp={() => endDrag(true)}
                onPointerCancel={() => endDrag(false)}
                className={`${TILE_CLASS} ${active ? TILE_ACTIVE_CLASS : TILE_IDLE_CLASS} ${
                  canReorder ? "cursor-grab active:cursor-grabbing" : ""
                } ${dragging ? "z-20 opacity-80" : ""} ${
                  dropId === item.profile && dragId !== item.profile ? "scale-[1.03]" : ""
                }`}
                style={
                  dragging
                    ? {
                        transform: `translate(${dragDelta.x}px, ${dragDelta.y}px) scale(1.05)`,
                        pointerEvents: "none",
                        transition: "none",
                      }
                    : undefined
                }
              >
                <Icon className={`h-6 w-6 ${meta.color}`} />
                <TileLabel>{meta.short}</TileLabel>
                {active && (
                  <span className="pointer-events-none absolute -top-1.5 h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.9)]" />
                )}
              </button>
            );
          })}
        </div>

        {edges.right && (
          <button
            type="button"
            title="Scroll profiles right"
            onClick={() => scrollStrip(1)}
            className="flex h-12 w-6 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </nav>
  );
}
