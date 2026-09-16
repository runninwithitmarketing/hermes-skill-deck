import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, LayoutGrid, Moon, RefreshCw, Sun } from "lucide-react";
import { displayFolders, filterDisplaySkills } from "../lib/displayTaxonomy";
import HermesLogo from "./HermesLogo";
import MagneticMenu from "./MagneticMenu";
import SearchBar from "./SearchBar";

// A menu is either a `group` (dropdown of folder items) or a single `folder`
// (its dropdown lists "All <folder>" plus that folder's subfolders directly).
// Menus behave like Mac menus: top-line -> folders -> subfolders -> skills,
// each level revealed by hovering the arrow on the row to its left.
const DROPDOWN_GROUPS = [
  { label: "Marketing", items: ["SEO", "Agency", "Writing"] },
  { label: "Creative", folder: "Creative" },
  { label: "YouTube", folder: "YouTube" },
  { label: "Notion", folder: "Notion" },
  { label: "Spotify", folder: "Spotify & Music" },
  { label: "Dev Tools", items: ["Coding", "Hermes Ops", "Automation & Integrations"] },
  { label: "Data", items: ["Stock & Markets", "News & Feeds", "Research"] },
  { label: "Ops", items: ["Data & ML", "Skill Bundles", "Personal & Utilities"] },
];

const folderByLabel = new Map(displayFolders.map((folder) => [folder.label, folder]));

function subfoldersFor(label) {
  return folderByLabel.get(label)?.subfolders ?? [];
}

function folderIdForLabel(label) {
  return folderByLabel.get(label)?.id ?? null;
}

const PANEL_CLASS =
  "origin-top-left animate-[dropdown-in_160ms_ease-out] rounded-2xl border border-white/12 bg-slate-900 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)_inset]";

function HermesIcon() {
  return <HermesLogo iconClassName="h-7 w-10" />;
}

// Deepest flyout level: the actual skills inside one subfolder. Clicking a
// skill opens it. Renders nothing when the subfolder has no matched skills.
function SubfolderItem({ folderLabel, sub, skills, onOpenSkill, onNavigate, onClose }) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const folderId = folderIdForLabel(folderLabel);
  const subSkills = useMemo(
    () => filterDisplaySkills(skills, { folderId, subfolderId: sub.id }),
    [skills, folderId, sub.id],
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
          onNavigate(folderLabel, sub.id);
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
function NavMenuItem({ label, skills, onOpenSkill, onNavigate, onClose }) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const subfolders = subfoldersFor(label);
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
          onNavigate(label);
          onClose();
        }}
        data-mag
        className={`relative z-10 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-ui font-semibold text-white/78 transition hover:text-white ${flyoutOpen && hasSubfolders ? "text-white" : ""}`}
      >
        <span>{label}</span>
        {hasSubfolders && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/45" />}
      </button>

      {flyoutOpen && hasSubfolders && (
        <div className="absolute left-full top-0 z-50 pl-1.5">
          <MagneticMenu className={`relative min-w-[200px] ${PANEL_CLASS}`} radius="row">
            {subfolders.map((sub) => (
              <SubfolderItem
                key={sub.id}
                folderLabel={label}
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
function FolderMenuPanel({ folderLabel, skills, onOpenSkill, onNavigate, onClose }) {
  const subfolders = subfoldersFor(folderLabel);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onNavigate(folderLabel);
          onClose();
        }}
        data-mag
        className="relative z-10 block w-full rounded-xl px-3 py-2 text-left text-sm font-ui font-semibold text-white transition"
      >
        All {folderLabel}
      </button>

      {subfolders.length > 0 && <div className="mx-2 my-1.5 border-t border-white/10" />}

      {subfolders.map((sub) => (
        <SubfolderItem
          key={sub.id}
          folderLabel={folderLabel}
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

function NavDropdown({ group, open, onOpen, onClose, onNavigate, skills, onOpenSkill }) {
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
        <MagneticMenu className={`absolute left-0 top-full z-50 mt-1.5 min-w-[200px] origin-top ${PANEL_CLASS}`} radius="row">
          {group.folder ? (
            <FolderMenuPanel
              folderLabel={group.folder}
              skills={skills}
              onOpenSkill={onOpenSkill}
              onNavigate={onNavigate}
              onClose={onClose}
            />
          ) : (
            group.items.map((item) => (
              <NavMenuItem
                key={item}
                label={item}
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
}) {
  const [openGroup, setOpenGroup] = useState(null);
  const navRef = useRef(null);
  const darkMode = theme !== "light";
  const nextThemeLabel = darkMode ? "Light mode" : "Dark mode";

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

        <nav ref={navRef} className="hidden shrink-0 whitespace-nowrap min-[1360px]:block">
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

            {DROPDOWN_GROUPS.map((group) => (
              <NavDropdown
                key={group.label}
                group={group}
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
