import { useMemo, useState } from "react";
import {
  Bot,
  Boxes,
  Brain,
  Briefcase,
  Clapperboard,
  Code2,
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
import { displayFolders } from "../lib/displayTaxonomy";
import { getCategoryVisual } from "../lib/categoryVisuals.jsx";

/* Sandbox-only emblem map (keyed by folder id) so we don't touch the live
   categoryVisuals.jsx. These mirror the mockup's per-category intent. */
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

const FAKE_COUNTS = [12, 7, 9, 18, 5, 14, 8, 11, 6, 4, 10, 7, 9, 13, 3, 16];

const PIXEL_COLS = 16;
const PIXEL_ROWS = 13;

function varsFor(visual) {
  return {
    "--fld-metal-top": visual.metalTop,
    "--fld-metal-mid": visual.metalMid,
    "--fld-metal-deep": visual.metalDeep,
    "--fld-tab-top": visual.tabTop,
    "--fld-tab-mid": visual.tabMid,
    "--fld-tab-deep": visual.tabDeep,
    "--fld-rim": visual.rim,
    "--fld-highlight": visual.highlight,
    "--fld-shine": visual.shine,
    "--fld-glow": visual.glow,
  };
}

function PixelWipe() {
  // One mosaic cell per square; staggered random delays = pixel-dissolve.
  const cells = useMemo(
    () =>
      Array.from({ length: PIXEL_COLS * PIXEL_ROWS }, () => ({
        d: Math.round(Math.random() * 360),
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

function LabFolder({ folder, visual, Icon, size = "md", count, opening, onOpen }) {
  return (
    <button
      type="button"
      className={`fld-card fld-card-${size}`}
      style={varsFor(visual)}
      onClick={() => onOpen?.(folder.id)}
      aria-label={`Open ${folder.label}`}
    >
      <span className={`fld fld-${size} ${opening ? "is-opening" : ""}`}>
        <span className="fld-glow" aria-hidden="true" />
        <span className="fld-tab" aria-hidden="true" />
        <span className="fld-back" aria-hidden="true" />
        <span className="fld-paper" aria-hidden="true" />
        <span className="fld-front" aria-hidden="true">
          <span className="fld-brush" />
          <span className="fld-shine" />
          <span className="fld-emblem">
            <Icon strokeWidth={2.4} />
          </span>
        </span>
        {opening && <PixelWipe />}
      </span>

      <span className="fld-meta">
        <span className="fld-label">{folder.label}</span>
        <span className="fld-count">{count} skills</span>
      </span>
    </button>
  );
}

export default function FolderLab() {
  const [openingId, setOpeningId] = useState(null);
  const [showNext, setShowNext] = useState(false);

  const items = useMemo(
    () =>
      displayFolders.map((folder, index) => {
        const visual = getCategoryVisual(`${folder.id} ${folder.label}`, index);
        const Icon = EMBLEMS[folder.id] || EMBLEMS.coding;
        return { folder, visual, Icon, count: FAKE_COUNTS[index % FAKE_COUNTS.length] };
      }),
    [],
  );

  const hero = items[0];

  function handleOpen(id) {
    if (openingId) return;
    setOpeningId(id);
    window.setTimeout(() => setShowNext(true), 720);
  }

  function reset() {
    setShowNext(false);
    setOpeningId(null);
  }

  const openingItem = items.find((it) => it.folder.id === openingId);

  return (
    <div className="desktop-shell min-h-screen w-full">
      <div className="desktop-ambient" aria-hidden="true" />
      <main className="relative z-10 mx-auto max-w-[1240px] px-6 py-16">
        <header className="text-center">
          <p className="font-ui text-xs font-bold uppercase tracking-[0.32em] text-white/45">
            Design Sandbox · not the live app
          </p>
          <h1 className="font-heading mt-3 text-4xl font-bold text-white md:text-5xl">
            Folder Redesign Lab
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/55">
            New folder shape with the existing colors + brushed/grid finish, a 3D color-matched
            emblem on the front, hover-to-peek the file, and a pixelated open transition. Hover any
            folder; click one to see the transition.
          </p>
        </header>

        {/* Hero interactive folder */}
        <section className="mt-14 flex flex-col items-center">
          <LabFolder
            folder={hero.folder}
            visual={hero.visual}
            Icon={hero.Icon}
            count={hero.count}
            size="lg"
            opening={openingId === hero.folder.id}
            onOpen={handleOpen}
          />
        </section>

        {/* Full 16-color matrix */}
        <section className="mt-20">
          <div className="mb-7 flex items-center justify-between gap-4">
            <h2 className="font-ui text-xs font-bold uppercase tracking-[0.2em] text-white/48">
              All 16 categories
            </h2>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm font-semibold text-white/56">
              colors unchanged
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((it) => (
              <LabFolder
                key={it.folder.id}
                folder={it.folder}
                visual={it.visual}
                Icon={it.Icon}
                count={it.count}
                size="md"
                opening={openingId === it.folder.id}
                onOpen={handleOpen}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Demo "next screen" after the pixel transition */}
      {showNext && openingItem && (
        <div className="fld-next" style={varsFor(openingItem.visual)}>
          <div className="fld-next-card detail-panel">
            <span className="fld-next-emblem">
              <openingItem.Icon strokeWidth={2.2} />
            </span>
            <h2 className="font-heading text-3xl font-bold text-white">
              {openingItem.folder.label}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/60">
              {openingItem.folder.description}
            </p>
            <button type="button" onClick={reset} className="fld-next-back">
              ← Back to folders
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
