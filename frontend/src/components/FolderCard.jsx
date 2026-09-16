import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Boxes,
  Brain,
  Briefcase,
  Clapperboard,
  Code2,
  FolderOpen,
  Hammer,
  Microscope,
  Music,
  Newspaper,
  Notebook,
  PenLine,
  Play,
  Search,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { countLabel } from "../lib/format";
import { getCategoryVisual, materials } from "../lib/categoryVisuals.jsx";
import ContextMenu from "./ContextMenu";

// Curated per-folder emblem (3D color-matched icon on the front flap).
const EMBLEMS = {
  seo: Search,
  agency: Briefcase,
  writing: PenLine,
  creative: Clapperboard,
  youtube: Play,
  coding: Code2,
  "hermes-ops": Bot,
  "automation-integrations": Workflow,
  notion: Notebook,
  "stock-markets": TrendingUp,
  "spotify-music": Music,
  "news-feeds": Newspaper,
  "data-ml": Brain,
  research: Microscope,
  "skill-bundles": Boxes,
  "personal-utilities": Hammer,
};

const PIXEL_COLS = 14;
const PIXEL_ROWS = 10;

function PixelWipe() {
  const cells = useMemo(
    () =>
      Array.from({ length: PIXEL_COLS * PIXEL_ROWS }, () => ({
        d: Math.round(Math.random() * 130),
      })),
    [],
  );
  return (
    <span className="fld-pixels" aria-hidden="true">
      {cells.map((c, i) => (
        <span key={i} className="fld-pixel" style={{ "--d": `${c.d}ms` }} />
      ))}
    </span>
  );
}

export default function FolderCard({
  active = false,
  count,
  folder,
  index,
  onClick,
  onColorOverride,
  onRenameOverride,
  onResetOverride,
  onDeleteFolder,
  onSetFolderRule,
  railed = false,
}) {
  const [opening, setOpening] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);

  // Use override label if present
  const displayLabel = folder.overrideLabel || folder.label;

  // Use override material or auto-detect
  const visual = useMemo(() => {
    if (folder.overrideMaterialKey && materials[folder.overrideMaterialKey]) {
      return materials[folder.overrideMaterialKey];
    }
    return getCategoryVisual(`${folder.id} ${folder.label}`, index);
  }, [folder.id, folder.label, folder.overrideMaterialKey, index]);

  const Emblem = EMBLEMS[folder.id] || FolderOpen;

  // Determine which material key is currently active
  const currentMaterialKey = useMemo(() => {
    if (folder.overrideMaterialKey) return folder.overrideMaterialKey;
    const entry = Object.entries(materials).find(
      ([, m]) => m.material === visual.material
    );
    return entry ? entry[0] : "emerald";
  }, [visual.material, folder.overrideMaterialKey]);

  useEffect(() => {
    if (!opening) return undefined;
    const timer = window.setTimeout(() => {
      onClick();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [onClick, opening]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpening(true)}
        onContextMenu={(e) => {
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY });
        }}
        disabled={railed}
        tabIndex={railed ? -1 : undefined}
        aria-hidden={railed || undefined}
        className="group flex min-h-[220px] flex-col items-center justify-start gap-4 rounded-[2rem] p-3 text-center outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-sky-200/70"
        aria-label={`Open ${displayLabel}`}
      >
        <span
          className={`fld ${opening ? "is-opening" : ""} ${active ? "is-selected" : ""}`}
          style={{
            "--fld-glow": visual.glow,
            "--fld-metal-top": visual.metalTop,
            "--fld-metal-mid": visual.metalMid,
            "--fld-metal-deep": visual.metalDeep,
            "--fld-tab-top": visual.tabTop,
            "--fld-tab-mid": visual.tabMid,
            "--fld-tab-deep": visual.tabDeep,
            "--fld-rim": visual.rim,
            "--fld-highlight": visual.highlight,
            "--fld-shine": visual.shine,
          }}
        >
          <span className="fld-glow" aria-hidden="true" />
          <span className="fld-tab" aria-hidden="true" />
          <span className="fld-back" aria-hidden="true" />
          <span className="fld-paper" aria-hidden="true" />
          <span className="fld-front" aria-hidden="true">
            <span className="fld-brush" />
            <span className="fld-shine" />
            <span className="fld-emblem">
              <Emblem strokeWidth={2.4} />
            </span>
          </span>
          {opening && <PixelWipe />}
        </span>

        <span className="max-w-[190px]">
          <span className="font-heading block text-base font-bold text-white drop-shadow">
            {displayLabel}
          </span>
          <span className="mt-1 block text-sm font-medium text-white/62">
            {countLabel(count)}
          </span>
          <span className="mt-2 line-clamp-2 block text-xs leading-5 text-white/42">
            {folder.description}
          </span>
        </span>
      </button>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          folderId={folder.id}
          currentLabel={displayLabel}
          currentMaterialKey={currentMaterialKey}
          onClose={() => setCtxMenu(null)}
          onColorChange={(folderId, key) => {
            onColorOverride?.(folderId, key);
            setCtxMenu(null);
          }}
          onRename={(folderId, label) => {
            onRenameOverride?.(folderId, label);
            setCtxMenu(null);
          }}
          onReset={(folderId) => {
            onResetOverride?.(folderId);
            setCtxMenu(null);
          }}
          onDelete={folder.custom && onDeleteFolder ? () => {
            onDeleteFolder(folder.id);
            setCtxMenu(null);
          } : undefined}
          onSetRule={folder.custom ? (folderId, category) => {
            onSetFolderRule?.(folderId, category);
          } : undefined}
          currentCategory={folder.categories?.[0] ?? ""}
        />
      )}
    </>
  );
}
