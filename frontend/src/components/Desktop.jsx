import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, Plus, X } from "lucide-react";
import { countByDisplayFolder, createCustomFolder, deleteCustomFolder, displayFolderLabel, getPrimaryFolderId, matchSuggestionForLabel, setCustomFolderRule, suggestCustomFolders } from "../lib/displayTaxonomy";
import { categoryLabel, countLabel, titleize } from "../lib/format";
import FolderCard from "./FolderCard";
import HermesLogo from "./HermesLogo";
import InsightPanels from "./InsightPanels";

// How many search results to show before the "Show all" toggle kicks in.
const MATCHING_SKILLS_PREVIEW = 12;

// Ghost tile at the end of the folder grid: creates a custom skill box,
// optionally seeded with a category rule (so future syncs auto-file matches).
function NewFolderTile({ suggestions }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");

  const reset = () => {
    setOpen(false);
    setLabel("");
    setCategory("");
  };

  const create = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    let cat = category.trim();
    if (!cat) {
      // Blank category + a suggestion matching the box name (separator-
      // insensitive, so "Fantasy Football" ↔ fantasy-football) → attach it.
      const hit = matchSuggestionForLabel(trimmed, suggestions);
      if (hit) cat = hit.category;
    }
    createCustomFolder({
      label: trimmed,
      category: cat,
      description: cat ? `Custom box — auto-files the "${cat}" category.` : "",
    });
    reset();
  };

  // Live preview of the rule the box will carry (or the empty-box warning).
  const previewCategory = category.trim() || (label.trim() ? matchSuggestionForLabel(label, suggestions)?.category : null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed border-white/12 p-3 text-center transition hover:border-sky-300/35 hover:bg-white/4"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/6 text-white/60 transition group-hover:border-sky-300/35 group-hover:text-sky-200">
          <Plus className="h-6 w-6" />
        </span>
        <span className="font-heading text-base font-bold text-white/70 transition group-hover:text-white">New Skill Box</span>
        <span className="max-w-[180px] text-xs leading-5 text-white/38">
          Create a custom box and give stray skills a real home
        </span>
      </button>
    );
  }

  return (
    <div className="flex min-h-[220px] flex-col rounded-[2rem] border border-sky-300/25 bg-black/30 p-4">
      <div className="flex items-center justify-between">
        <span className="font-ui text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">New Skill Box</span>
        <button
          type="button"
          onClick={reset}
          aria-label="Cancel"
          className="flex h-6 w-6 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") create();
          if (e.key === "Escape") reset();
        }}
        placeholder="Box name (e.g. Fantasy)"
        className="mt-3 w-full rounded-xl border border-white/12 bg-white/6 px-3 py-2 font-heading text-base font-bold text-white placeholder:font-ui placeholder:text-sm placeholder:font-medium placeholder:text-white/35 focus:border-sky-300/45 focus:outline-none"
      />
      {label.trim() && (
        <p className={`mt-2 text-[11px] leading-4 ${previewCategory ? "text-sky-200/75" : "text-amber-200/60"}`}>
          {previewCategory
            ? `Rule: auto-files "${previewCategory}" — matching skills land here on every sync.`
            : "No category rule matched — this box stays empty until you pin skills into it (File into)."}
        </p>
      )}
      {suggestions.length > 0 && (
        <div className="mt-3">
          <div className="font-ui text-[10px] font-semibold uppercase tracking-wider text-white/35">
            Auto-file a category into this box
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {suggestions.slice(0, 8).map((s) => (
              <button
                key={s.category}
                type="button"
                onClick={() => setCategory(category === s.category ? "" : s.category)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                  category === s.category
                    ? "border-sky-300/50 bg-sky-400/20 text-sky-100"
                    : "border-white/12 bg-white/6 text-white/55 hover:border-white/25 hover:text-white/80"
                }`}
              >
                {s.category} · {s.count}
              </button>
            ))}
          </div>
        </div>
      )}
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="or type a raw category (optional)"
        className="mt-3 w-full rounded-xl border border-white/12 bg-white/6 px-3 py-2 font-ui text-sm font-medium text-white placeholder:text-white/35 focus:border-sky-300/45 focus:outline-none"
      />
      <div className="mt-auto flex items-center justify-end gap-2 pt-4">
        <button type="button" onClick={reset} className="rounded-full px-3 py-1.5 font-ui text-sm font-semibold text-white/50 transition hover:text-white">
          Cancel
        </button>
        <button
          type="button"
          onClick={create}
          disabled={!label.trim()}
          className="rounded-full border border-sky-300/30 bg-sky-400/18 px-4 py-1.5 font-ui text-sm font-bold text-sky-100 transition hover:bg-sky-400/28 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create box
        </button>
      </div>
    </div>
  );
}

export default function Desktop({
  filteredSkills,
  folders,
  loading,
  offline,
  onOpenFolder,
  onOpenSkill,
  onSync,
  recentSkills,
  search,
  selectedProfile,
  summary,
  syncing,
  topFolders,
  onColorOverride,
  onRenameOverride,
  onResetOverride,
  terminalActive = false,
  theme = "dark",
  onToggleTheme,
  taxonomyVersion = 0,
  onReorderFolders,
  favoriteSkills,
}) {
  const searchFolders = useMemo(() => {
    const raw = search.trim() ? countByDisplayFolder(filteredSkills, { hideEmpty: true }) : folders;
    // Merge override data from folders (which already has overrides from props)
    const overrideMap = {};
    folders.forEach((f) => {
      if (f.overrideMaterialKey || f.overrideLabel) overrideMap[f.id] = f;
    });
    return raw.map((f) => (overrideMap[f.id] ? { ...f, ...overrideMap[f.id] } : f));
  }, [search, filteredSkills, folders]);

  // Categories that look like they deserve their own box (not homed by the
  // built-in taxonomy or an existing custom box) — offered as one-click rules
  // in the New Skill Box form (top 8 shown, full list used for name matching).
  const folderSuggestions = useMemo(
    () => suggestCustomFolders(filteredSkills, { limit: 40 }),
    [filteredSkills, taxonomyVersion],
  );

  // Terminal mode: split the grid into two side rails by measuring each card and
  // compressing each half toward its edge, clearing the center for the terminal.
  // Position-based (not index-based) so it's correct across the responsive grid.
  const gridRef = useRef(null);
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return undefined;
    const cards = Array.from(grid.children);
    if (!terminalActive) {
      cards.forEach((el) => el.style.removeProperty("--rail-x"));
      return undefined;
    }
    const apply = () => {
      const gr = grid.getBoundingClientRect();
      const center = gr.left + gr.width / 2;
      cards.forEach((el) => {
        const r = el.getBoundingClientRect();
        const cardCenter = r.left + r.width / 2;
        const isLeft = cardCenter < center;
        const k = 0.32; // how tightly each half hugs its edge
        const target = isLeft ? gr.left + (cardCenter - gr.left) * k : gr.right - (gr.right - cardCenter) * k;
        el.style.setProperty("--rail-x", `${Math.round(target - cardCenter)}px`);
      });
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [terminalActive, searchFolders]);

  // Search results lead with the skills themselves; boxes with matches follow
  // below as a way to jump into a filtered folder view.
  const [showAllSkills, setShowAllSkills] = useState(false);

  // ── Folder tile reordering (pointer events — HTML5 DnD is unreliable in
  // the macOS WKWebView; same threshold+hit-test pattern as the Dock's
  // profile strip). Disabled while railed (Terminal) or during a search,
  // where the grid is a filtered subset and reordering would scramble. ──
  const canReorderFolders = Boolean(onReorderFolders) && !terminalActive && !search.trim();
  const [dragFolderId, setDragFolderId] = useState(null);
  const [dropFolderId, setDropFolderId] = useState(null);
  const [dragEngaged, setDragEngaged] = useState(false);
  const pressRef = useRef(null);
  const dropRef = useRef(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (dragFolderId === null) return undefined;
    const handleMove = (e) => {
      const st = pressRef.current;
      if (!st) return;
      if (!st.engaged && Math.hypot(e.clientX - st.startX, e.clientY - st.startY) > 6) {
        st.engaged = true;
        setDragEngaged(true);
      }
      if (!st.engaged) return;
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const target = hit && hit.closest("[data-folder-id]");
      const tid = target && target.dataset.folderId !== st.id ? target.dataset.folderId : null;
      dropRef.current = tid;
      setDropFolderId((cur) => (cur === tid ? cur : tid));
    };
    const handleUp = () => {
      const st = pressRef.current;
      pressRef.current = null;
      if (st && st.engaged) {
        suppressClickRef.current = true;
        const dropId = dropRef.current;
        if (dropId) {
          const ids = searchFolders.map((f) => f.id);
          const from = ids.indexOf(st.id);
          const to = ids.indexOf(dropId);
          if (from !== -1 && to !== -1) {
            ids.splice(to, 0, ids.splice(from, 1)[0]);
            onReorderFolders(ids);
          }
        }
      }
      setDragFolderId(null);
      setDropFolderId(null);
      setDragEngaged(false);
      dropRef.current = null;
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [dragFolderId, searchFolders, onReorderFolders]);

  const renderFolderGrid = (withNewTile) => (
    <div
      ref={gridRef}
      className={`grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 ${terminalActive ? "folders-railed" : ""}`}
    >
      {searchFolders.map((folder, index) => (
        <div
          key={folder.id}
          data-folder-id={folder.id}
          onPointerDown={(e) => {
            if (e.button !== 0 || !canReorderFolders) return;
            pressRef.current = { id: folder.id, startX: e.clientX, startY: e.clientY, engaged: false };
            setDragFolderId(folder.id);
          }}
          onClickCapture={(e) => {
            // A finished drag must not also open the folder.
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          className={`relative transition ${dragEngaged && dragFolderId === folder.id ? "opacity-50" : ""} ${
            dropFolderId === folder.id ? "z-10 rounded-[2rem] ring-2 ring-sky-300/70" : ""
          }`}
        >
          <FolderCard
            count={folder.count}
            folder={folder}
            index={index}
            onClick={() => onOpenFolder(folder.id)}
            onColorOverride={onColorOverride}
            onRenameOverride={onRenameOverride}
            onResetOverride={onResetOverride}
            onDeleteFolder={deleteCustomFolder}
            onSetFolderRule={setCustomFolderRule}
            railed={terminalActive}
          />
        </div>
      ))}
      {withNewTile && !terminalActive && <NewFolderTile key="new-folder-tile" suggestions={folderSuggestions} />}
    </div>
  );

  return (
    <main className="relative z-10 px-5 pb-48 pt-24 sm:px-8 lg:px-12">
      <div className={`grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px] ${terminalActive ? "folders-rail-host" : ""}`}>
        <section className="min-w-0">
          <div className="text-center">
            <div className="flex justify-center">
              <HermesLogo
                showText
                className="flex-col"
                iconClassName="h-20 w-32"
                textClassName="mt-2 block text-center text-4xl md:text-5xl"
              />
            </div>
            {offline && (
                <p className="mt-4 inline-flex rounded-full border border-amber-200/20 bg-amber-300/12 px-3 py-1 text-sm font-semibold text-amber-100">
                  Offline demo data
                </p>
              )}
              {selectedProfile && (
                <p className="mt-4 inline-flex rounded-full border border-emerald-200/20 bg-emerald-300/12 px-3 py-1 text-sm font-semibold text-emerald-100">
                  Profile: {selectedProfile}
                </p>
              )}
              {search && (
                <p className="mt-4 inline-flex rounded-full border border-sky-200/20 bg-sky-300/12 px-3 py-1 text-sm font-semibold text-sky-100">
                  Showing results for "{search}"
                </p>
              )}
            </div>

          {loading ? (
            <section className="mt-20">
              <div className="glass-panel flex h-64 items-center justify-center gap-3 text-white/70">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading skills
              </div>
            </section>
          ) : search.trim() ? (
            <>
              <section className="glass-panel mt-20 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="font-ui text-xs font-bold uppercase tracking-[0.18em] text-white/48">Matching Skills</h2>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm font-semibold text-white/56">
                      {countLabel(filteredSkills.length)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenFolder(null)}
                    className="inline-flex items-center gap-2 rounded-full bg-white/9 px-3 py-1.5 text-sm font-semibold text-white/70 transition hover:bg-white/14"
                  >
                    Open all
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                {filteredSkills.length ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {filteredSkills
                        .slice(0, showAllSkills ? undefined : MATCHING_SKILLS_PREVIEW)
                        .map((skill) => (
                          <button
                            type="button"
                            key={skill.id}
                            onClick={() => onOpenSkill(skill)}
                            className="rounded-2xl border border-white/8 bg-black/18 p-4 text-left transition hover:border-white/18 hover:bg-white/9"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="truncate text-base font-bold text-white">{titleize(skill.name)}</h3>
                              <span className="shrink-0 rounded-full bg-white/8 px-2 py-1 text-xs font-semibold text-white/48">
                                {titleize(skill.profile)}
                              </span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/60">{skill.description || categoryLabel(skill.category)}</p>
                            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-white/36">
                              Filed in {displayFolderLabel(getPrimaryFolderId(skill))}
                            </span>
                          </button>
                        ))}
                    </div>
                    {filteredSkills.length > MATCHING_SKILLS_PREVIEW && (
                      <button
                        type="button"
                        onClick={() => setShowAllSkills((v) => !v)}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/9 px-3 py-1.5 text-sm font-semibold text-white/70 transition hover:bg-white/14"
                      >
                        {showAllSkills ? "Show fewer" : `Show all ${filteredSkills.length}`}
                        <ArrowRight className={`h-4 w-4 ${showAllSkills ? "-rotate-90" : ""}`} />
                      </button>
                    )}
                  </>
                ) : (
                  <p className="py-6 text-center text-white/60">No skills match that search.</p>
                )}
              </section>

              {searchFolders.length > 0 && (
                <section className="mt-10">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <h2 className="font-ui text-xs font-bold uppercase tracking-[0.2em] text-white/48">
                      Skill Boxes with Matches
                    </h2>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm font-semibold text-white/56">
                      {searchFolders.length} {searchFolders.length === 1 ? "box" : "boxes"}
                    </span>
                  </div>
                  {renderFolderGrid(false)}
                </section>
              )}
            </>
          ) : (
            <section className="mt-20">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-ui text-xs font-bold uppercase tracking-[0.2em] text-white/48">
                    Main Skill Boxes
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm font-semibold text-white/56">
                  {countLabel(filteredSkills.length)}
                </span>
              </div>
              {renderFolderGrid(true)}
            </section>
          )}

        </section>

        <InsightPanels
          summary={summary}
          topFolders={topFolders}
          onOpenFolder={onOpenFolder}
          theme={theme}
          onToggleTheme={onToggleTheme}
          favoriteSkills={favoriteSkills}
          onOpenSkill={onOpenSkill}
        />
      </div>
    </main>
  );
}
