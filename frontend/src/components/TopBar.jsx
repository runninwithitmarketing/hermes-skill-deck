import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, LayoutGrid, Moon, Plus, RefreshCw, Sun } from "lucide-react";
import { displayFolders, filterDisplaySkills } from "../lib/displayTaxonomy";
import HermesLogo from "./HermesLogo";
import MagneticMenu from "./MagneticMenu";
import SearchBar from "./SearchBar";

// A menu is either a `group` (dropdown of folder items) or a single `folder`
// (its dropdown lists "All <folder>" plus that folder's subfolders directly).
// Menus behave like Mac menus: top-line -> folders -> subfolders -> skills,
// each level revealed by hovering the arrow on the row to its left.
// Items reference folders by stable id: the live folder list (passed in as
// `folders`, with user renames applied and empty boxes hidden) decides the
// displayed label and whether the item shows at all — so a renamed box keeps
// its menu entry under the new name, and an empty one drops out of the nav.
const DROPDOWN_GROUPS = [
  { label: "Marketing", items: ["seo", "agency", "writing"] },
  { label: "Creative", folder: "creative" },
  { label: "YouTube", folder: "youtube" },
  { label: "Notion", folder: "notion" },
  { label: "Spotify", folder: "spotify-music" },
  { label: "Dev Tools", items: ["coding", "hermes-ops", "automation-integrations"] },
  { label: "Data", items: ["stock-markets", "news-feeds", "research"] },
  { label: "Ops", items: ["data-ml", "skill-bundles", "personal-utilities"] },
];

const PANEL_CLASS =
  "origin-top-left animate-[dropdown-in_160ms_ease-out] rounded-2xl border border-white/12 bg-slate-900 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)_inset]";

// ── User-customized top nav ───────────────────────────────────────────────────
// When present, "nav-pinned" (localStorage) is a list of folder ids the user
// checked in the "+" editor — those become their personal top-bar menus,
// replacing the default groups. Null/absent = the shipped default nav.
const NAV_PINNED_KEY = "nav-pinned";

function readNavPinned() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NAV_PINNED_KEY) || "null");
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

// The "+" editor panel: every live folder with a checkbox. Checked boxes are
// the user's own top-bar menus, in the order they were checked.
function NavEditPanel({ folders, pinned, onToggle, onReset }) {
  return (
    <div className="w-72">
      <div className="px-2.5 pb-2 pt-1">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/36">Your top menus</div>
        <p className="mt-1 text-[11px] leading-4 text-white/45">
          Check the boxes you want in the top bar — they replace the default menus.
        </p>
      </div>
      <div className="max-h-[52vh] overflow-y-auto">
        {folders.map((f) => {
          const checked = pinned?.includes(f.id);
          return (
            <button
              key={f.id}
              type="button"
              data-mag
              onClick={() => onToggle(f.id)}
              className="relative z-10 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  checked ? "border-sky-300/70 bg-sky-400/25" : "border-white/25 bg-white/5"
                }`}
              >
                {checked && <Check className="h-3 w-3 text-sky-100" />}
              </span>
              <span className="truncate">{f.label}</span>
              <span className="ml-auto shrink-0 text-xs font-medium text-white/35">{f.count}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        data-mag
        onClick={onReset}
        className="relative z-10 mt-1 w-full rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold text-amber-200/75 transition hover:bg-white/10 hover:text-amber-100"
      >
        Use default menus
      </button>
    </div>
  );
}

function HermesIcon() {
  return <HermesLogo iconClassName="h-7 w-10" />;
}

// Deepest flyout level: the actual skills inside one subfolder. Clicking a
// skill opens it. Renders nothing when the subfolder has no matched skills.
function SubfolderItem({ folder, sub, skills, onOpenSkill, onNavigate, onClose }) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const subSkills = useMemo(
    () => filterDisplaySkills(skills, { folderId: folder.id, subfolderId: sub.id }),
    [skills, folder.id, sub.id],
  );

  if (!subSkills.length) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setFlyoutOpen(true)}
      onMouseLeave={() => setFlyoutOpen(false)}
    >
      <button
        type="button"
        onClick={() => {
          onNavigate(folder.id, sub.id);
          onClose();
        }}
        data-mag
        className={`relative z-10 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-ui font-semibold text-white/78 transition hover:text-white ${flyoutOpen ? "text-white" : ""}`}
      >
        <span>{sub.label}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/45" />
      </button>

      {flyoutOpen && (
        <div className="absolute left-full top-0 z-50 pl-1.5">
          <MagneticMenu className={`relative max-h-[70vh] min-w-[220px] overflow-y-auto ${PANEL_CLASS}`} radius="row">
            {subSkills.map((skill) => (
              <button
                type="button"
                key={skill.id}
                onClick={() => {
                  onOpenSkill(skill);
                  onClose();
                }}
                data-mag
                className="relative z-10 block w-full truncate rounded-xl px-3 py-2 text-left text-sm font-ui font-semibold text-white/78 transition hover:text-white"
              >
                {skill.name}
              </button>
            ))}
          </MagneticMenu>
        </div>
      )}
    </div>
  );
}

// A folder row inside a group menu. Hovering reveals its subfolders, each of
// which in turn reveals its skills (SubfolderItem). Clicking opens the folder.
function NavMenuItem({ folder, skills, onOpenSkill, onNavigate, onClose }) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const subfolders = folder.subfolders ?? [];
  const hasSubfolders = subfolders.length > 0;

  return (
    <div
      className="relative"
      onMouseEnter={() => setFlyoutOpen(true)}
      onMouseLeave={() => setFlyoutOpen(false)}
    >
      <button
        type="button"
        onClick={() => {
          onNavigate(folder.id);
          onClose();
        }}
        data-mag
        className={`relative z-10 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-ui font-semibold text-white/78 transition hover:text-white ${flyoutOpen && hasSubfolders ? "text-white" : ""}`}
      >
        <span>{folder.label}</span>
        {hasSubfolders && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/45" />}
      </button>

      {flyoutOpen && hasSubfolders && (
        <div className="absolute left-full top-0 z-50 pl-1.5">
          <MagneticMenu className={`relative min-w-[200px] ${PANEL_CLASS}`} radius="row">
            {subfolders.map((sub) => (
              <SubfolderItem
                key={sub.id}
                folder={folder}
                sub={sub}
                skills={skills}
                onOpenSkill={onOpenSkill}
                onNavigate={onNavigate}
                onClose={onClose}
              />
            ))}
          </MagneticMenu>
        </div>
      )}
    </div>
  );
}

// Dropdown body for a folder that owns its own top-line menu: an "All <folder>"
// shortcut, then each subfolder as a row that reveals its skills on hover.
function FolderMenuPanel({ folder, skills, onOpenSkill, onNavigate, onClose }) {
  const subfolders = folder.subfolders ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onNavigate(folder.id);
          onClose();
        }}
        data-mag
        className="relative z-10 block w-full rounded-xl px-3 py-2 text-left text-sm font-ui font-semibold text-white transition"
      >
        All {folder.label}
      </button>

      {subfolders.length > 0 && <div className="mx-2 my-1.5 border-t border-white/10" />}

      {subfolders.map((sub) => (
        <SubfolderItem
          key={sub.id}
          folder={folder}
          sub={sub}
          skills={skills}
          onOpenSkill={onOpenSkill}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      ))}
    </>
  );
}

function NavDropdown({ group, folders, open, onOpen, onClose, onNavigate, skills, onOpenSkill }) {
  const closeTimer = useRef(null);

  function cancelClose() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(onClose, 120);
  }

  useEffect(() => cancelClose, []);

  // Resolve the group's folder refs against the live list. An id missing from
  // `folders` (hidden/empty, or removed) drops out of the nav — but this early
  // return must stay AFTER the useEffect so the hook order never varies.
  const groupFolder = group.folder ? folders.find((f) => f.id === group.folder) : null;
  const groupItems = group.items
    ? group.items.map((id) => folders.find((f) => f.id === id)).filter(Boolean)
    : [];
  if (group.folder ? !groupFolder : groupItems.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        onOpen();
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => (open ? onClose() : onOpen())}
        aria-haspopup="true"
        aria-expanded={open}
        data-mag
        className={`relative z-10 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1.5 text-xs font-ui font-semibold text-white/78 transition hover:text-white ${open ? "text-white" : ""}`}
      >
        {group.label}
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <MagneticMenu className={`absolute left-0 top-full z-50 mt-1.5 max-h-[70vh] min-w-[200px] origin-top overflow-y-auto ${PANEL_CLASS}`} radius="row">
          {group.folder ? (
            <FolderMenuPanel
              folder={groupFolder}
              skills={skills}
              onOpenSkill={onOpenSkill}
              onNavigate={onNavigate}
              onClose={onClose}
            />
          ) : (
            groupItems.map((folder) => (
              <NavMenuItem
                key={folder.id}
                folder={folder}
                skills={skills}
                onOpenSkill={onOpenSkill}
                onNavigate={onNavigate}
                onClose={onClose}
              />
            ))
          )}
        </MagneticMenu>
      )}
    </div>
  );
}

export default function TopBar({
  onNavigate,
  skills = [],
  onOpenSkill,
  search,
  onSearchChange,
  syncing,
  onSync,
  theme = "dark",
  onToggleTheme,
  folders = displayFolders,
}) {
  const [openGroup, setOpenGroup] = useState(null);
  const navRef = useRef(null);
  const darkMode = theme !== "light";
  const nextThemeLabel = darkMode ? "Light mode" : "Dark mode";
  // The user's own menu picks (folder ids). Null = shipped default nav.
  const [navPinned, setNavPinned] = useState(readNavPinned);

  const togglePinned = (id) => {
    setNavPinned((prev) => {
      const current = prev ?? [];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      if (next.length) localStorage.setItem(NAV_PINNED_KEY, JSON.stringify(next));
      else localStorage.removeItem(NAV_PINNED_KEY);
      return next.length ? next : null;
    });
  };

  const resetPinned = () => {
    localStorage.removeItem(NAV_PINNED_KEY);
    setNavPinned(null);
  };

  // Custom picks win: each pinned folder becomes its own top-level menu.
  // Otherwise the fixed groups, plus a live "My Boxes" group listing custom
  // boxes. NavDropdown drops ids missing from the live list either way.
  const navGroups = useMemo(() => {
    if (navPinned) {
      return navPinned
        .map((id) => folders.find((f) => f.id === id))
        .filter(Boolean)
        .map((f) => ({ label: f.label, folder: f.id }));
    }
    const customIds = folders.filter((f) => f.custom).map((f) => f.id);
    return customIds.length
      ? [...DROPDOWN_GROUPS, { label: "My Boxes", items: customIds }]
      : DROPDOWN_GROUPS;
  }, [folders, navPinned]);

  useEffect(() => {
    if (openGroup === null) return undefined;
    function handlePointerDown(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenGroup(null);
      }
    }
    function handleKey(event) {
      if (event.key === "Escape") setOpenGroup(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openGroup]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-white/10 bg-slate-950/35 text-white shadow-[0_1px_24px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <div className="flex h-full items-center gap-3 overflow-visible px-4">
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="flex shrink-0 items-center gap-2 rounded-full p-1.5 pr-3 font-ui text-sm font-semibold text-white/95 transition hover:bg-white/10"
        >
          <HermesIcon />
          <span className="hermes-logo-text hidden font-display text-sm font-bold text-white/90 sm:inline">
            Hermes Skill Deck
          </span>
        </button>

        {/* Menu strip shows at EVERY window width (the app allows resizing to
            1024). On narrow windows it scrolls horizontally instead of
            vanishing — hiding it below 1360px left users with no menus. */}
        <nav
          ref={navRef}
          className="min-w-0 shrink overflow-x-auto whitespace-nowrap"
          style={{ scrollbarWidth: "none" }}
        >
          <MagneticMenu className="relative flex items-center gap-0.5" radius="pill">
            <button
              type="button"
              onClick={() => onNavigate("all")}
              data-mag
              className="relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-ui font-semibold text-white/78 transition hover:text-white"
            >
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
              All Skills
            </button>

            <span className="mx-1 h-4 w-px shrink-0 bg-white/12" aria-hidden="true" />

            {navGroups.map((group) => (
              <NavDropdown
                key={group.folder || group.label}
                group={group}
                folders={folders}
                open={openGroup === group.label}
                onOpen={() => setOpenGroup(group.label)}
                // A menu's delayed close must only clear itself. Sliding the
                // cursor to an adjacent menu opens that one immediately; without
                // this guard the first menu's pending timer would clobber it,
                // causing the open/close flicker.
                onClose={() => setOpenGroup((current) => (current === group.label ? null : current))}
                onNavigate={onNavigate}
                skills={skills}
                onOpenSkill={onOpenSkill}
              />
            ))}

            {/* "+" opens the nav editor: users pick their own top-bar menus. */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenGroup((current) => (current === "__edit__" ? null : "__edit__"))}
                aria-haspopup="true"
                aria-expanded={openGroup === "__edit__"}
                aria-label="Customize your top menus"
                title="Customize your top menus"
                data-mag
                className={`relative z-10 inline-flex shrink-0 items-center justify-center rounded-full px-2 py-1.5 text-white/70 transition hover:text-white ${openGroup === "__edit__" ? "text-white" : ""}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>

              {openGroup === "__edit__" && (
                <div className={`absolute left-0 top-full z-50 mt-1.5 origin-top ${PANEL_CLASS}`}>
                  <NavEditPanel folders={folders} pinned={navPinned} onToggle={togglePinned} onReset={resetPinned} />
                </div>
              )}
            </div>
          </MagneticMenu>
        </nav>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <div className="hidden min-w-0 flex-1 md:block md:max-w-[340px]">
            <SearchBar value={search} onChange={onSearchChange} compact />
          </div>
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-300/20 bg-sky-400/14 text-sky-100 transition hover:bg-sky-400/22 disabled:cursor-wait disabled:opacity-60"
            title="Sync Now"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${nextThemeLabel}`}
            aria-pressed={!darkMode}
            title={`Switch to ${nextThemeLabel}`}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 font-ui text-xs font-semibold text-white/78 transition hover:border-white/20 hover:bg-white/14 hover:text-white"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-200" /> : <Moon className="h-4 w-4 text-indigo-200" />}
          </button>
        </div>
      </div>
    </header>
  );
}
