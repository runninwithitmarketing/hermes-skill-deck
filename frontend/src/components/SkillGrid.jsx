import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronDown, Copy, FolderOpen, FolderPlus, Lock, Sparkles, SquareTerminal, Star, X } from "lucide-react";
import { createCustomFolder, fileSkillInto, loadCustomFolders, loadMemberships } from "../lib/displayTaxonomy";
import {
  displayFolderLabel,
  getPrimaryFolderId,
  relatedSkills,
} from "../lib/displayTaxonomy";
import { categoryLabel, formatDate, relativeTime, titleize } from "../lib/format";
import { getCategoryVisual } from "../lib/categoryVisuals.jsx";
import { openSkillFolder, startSkillSession } from "../lib/api";
import ProfileBadges from "./ProfileBadges";

const PANEL_COLORS = {
  "Emerald Metal": "#047857",
  "Copper Metal": "#c2410c",
  "Crimson Metal": "#b91c1c",
  "Purple Titanium": "#7c3aed",
  "Graphite Metal": "#475569",
  "Blue Titanium": "#1d4ed8",
  "Indigo Alloy": "#4338ca",
  "Bronze Metal": "#92400e",
  "Teal Metal": "#0f766e",
  "Gold Metal": "#d97706",
  "Rose Gold": "#be123c",
  "Gunmetal": "#475569",
  "Midnight Metal": "#3730a3",
  "Amber Metal": "#d97706",
  "Brushed Silver": "#64748b",
  "Cyan Steel": "#0e7490",
  "Jade Metal": "#047857",
  "Champagne Metal": "#a16207",
};

// Mirror the grid's Tailwind breakpoints (grid-cols-1 / sm:2 / xl:3) so we can
// tell which cards share a row with the selected one, then drop the expanded
// panel directly beneath that whole row instead of inside the clicked cell.
function columnsForWidth(width) {
  if (width >= 1280) return 3;
  if (width >= 640) return 2;
  return 1;
}

function useColumnCount() {
  const [cols, setCols] = useState(() =>
    columnsForWidth(typeof window === "undefined" ? 1280 : window.innerWidth),
  );
  useEffect(() => {
    const onResize = () => setCols(columnsForWidth(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return cols;
}

function DetailTile({ label, value, borderColor, className = "", onClick, hint }) {
  const body = (
    <>
      <div className="font-ui text-[11px] font-bold uppercase tracking-[0.15em] text-white/36">{label}</div>
      <div className="mt-1 flex items-center gap-1.5 break-words text-sm font-semibold text-white/78">
        <span className="min-w-0 flex-1">{value}</span>
        {onClick ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/40" /> : null}
      </div>
    </>
  );
  if (!onClick) {
    return (
      <div className={`rounded-2xl detail-tile p-3 ${className}`} style={{ borderColor: borderColor, borderWidth: "4px", borderStyle: "solid" }}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint || label}
      className={`rounded-2xl detail-tile p-3 text-left transition hover:brightness-125 hover:shadow-[0_0_18px_rgba(255,255,255,0.08)] ${className}`}
      style={{ borderColor: borderColor, borderWidth: "4px", borderStyle: "solid" }}
    >
      {body}
    </button>
  );
}

function shortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function ExpandedCard({ skill, visual, onClose, related = [], onOpenRelated, onOpenFolder, onFilterCategory, onFilterProfile }) {
  const Icon = visual.Icon;
  const primaryFolderId = getPrimaryFolderId(skill);
  const cardRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [session, setSession] = useState("idle"); // idle | busy | done | error
  const [cmdCopied, setCmdCopied] = useState(false);
  const [filingOpen, setFilingOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState("");

  const customBoxes = filingOpen ? loadCustomFolders() : [];
  const pinnedFolderId = filingOpen ? loadMemberships()[(skill.name || "").toLowerCase()] : undefined;
  const pinnedLabel = customBoxes.find((b) => b.id === pinnedFolderId)?.label;

  // The exact command the Start Session action runs, kept in sync with the
  // backend's launch_skill_session (shown via title, copied by Copy cmd).
  const sessionCmd = `hermes --profile ${skill.profile || "default"} chat -s ${skill.name}`;

  // Bring the just-opened card fully into view (page scrolls), accounting for
  // the fixed TopBar + Dock via the scroll-mt/scroll-mb margins below.
  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [skill.id]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!cmdCopied) return undefined;
    const timer = window.setTimeout(() => setCmdCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [cmdCopied]);

  useEffect(() => {
    if (session === "done" || session === "error") {
      const timer = window.setTimeout(() => setSession("idle"), 2000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [session]);

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API can be unavailable — fall back to a hidden textarea.
      const helper = document.createElement("textarea");
      helper.value = text;
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
  };

  const copyPath = async () => {
    await copyText(skill.file_path);
    setCopied(true);
  };

  const copySessionCmd = async () => {
    await copyText(sessionCmd);
    setCmdCopied(true);
  };

  const launchSession = async () => {
    setSession("busy");
    try {
      await startSkillSession(skill.id);
      setSession("done");
    } catch {
      setSession("error");
    }
  };

  const tileBorder = { borderColor: visual.metalTop, borderWidth: "4px", borderStyle: "solid" };

  return (
    <div ref={cardRef} className="col-span-full scroll-mt-24 scroll-mb-32">
      <div className="app-card-drawer detail-panel rounded-2xl border p-5"
        style={{
          borderColor: visual.rim,
          background: `repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px 1px, rgba(0,0,0,0.02) 1px 2px, transparent 2px 4px), ${PANEL_COLORS[visual.material] || "#ea580c"}`,
          boxShadow: `0 0 32px ${visual.glow}, 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg"
              style={{ background: visual.gradient }}
            >
              <Icon className="h-6 w-6 text-white" />
            </span>
            <div className="min-w-0">
              <h3 className="font-heading truncate text-xl font-bold text-white">{titleize(skill.name)}</h3>
              <div className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.12em] text-white/40">
                {displayFolderLabel(primaryFolderId)} · {categoryLabel(skill.category)}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <ProfileBadges profiles={skill.profiles ?? [skill.profile]} />
                <span
                  className="text-[11px] font-medium text-white/38"
                  title={`Created ${formatDate(skill.created_at)} · Updated ${formatDate(skill.updated_at)}`}
                >
                  Created {shortDate(skill.created_at)} · Updated {shortDate(skill.updated_at)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-ui hidden items-center gap-2 rounded-full border border-white/10 bg-white/7 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white/52 sm:inline-flex">
              <Lock className="h-3.5 w-3.5" />
              Read Only
            </span>
            <button
              type="button"
              onClick={onClose}
              title="Collapse"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/24 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-white/66">{skill.description || "No description in frontmatter."}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailTile
            label="Primary Skill Box"
            value={displayFolderLabel(primaryFolderId)}
            borderColor={visual.metalTop}
            onClick={onOpenFolder ? () => onOpenFolder(primaryFolderId) : undefined}
            hint={`Open the ${displayFolderLabel(primaryFolderId)} skill box`}
          />
          <DetailTile
            label="Raw Category"
            value={categoryLabel(skill.category)}
            borderColor={visual.metalTop}
            onClick={onFilterCategory && skill.category ? () => onFilterCategory(skill.category) : undefined}
            hint={`Show all ${categoryLabel(skill.category)} skills`}
          />
          <DetailTile
            label="Profile"
            value={titleize(skill.profile)}
            borderColor={visual.metalTop}
            onClick={onFilterProfile ? () => onFilterProfile(skill.profile) : undefined}
            hint={`Filter the dashboard to the ${titleize(skill.profile)} profile`}
          />
          <div className="detail-tile rounded-2xl p-3 sm:col-span-2 lg:col-span-3" style={tileBorder}>
            <div className="font-ui text-[11px] font-bold uppercase tracking-[0.15em] text-white/36">Related Skills</div>
            {related.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {related.map((rel) => (
                  <button
                    type="button"
                    key={rel.id}
                    onClick={() => onOpenRelated?.(rel)}
                    title={rel.description || titleize(rel.name)}
                    className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-xs font-semibold text-white/78 transition hover:border-white/25 hover:bg-white/16 hover:text-white"
                  >
                    {titleize(rel.name)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-medium text-white/45">No related skills found in this library yet.</p>
            )}
          </div>
          <div className="detail-tile rounded-2xl p-3 sm:col-span-2 lg:col-span-3" style={tileBorder}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="font-ui shrink-0 text-[11px] font-bold uppercase tracking-[0.15em] text-white/36">Quick Actions</div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={launchSession}
                  disabled={session === "busy"}
                  title={`Open Terminal.app and run: ${sessionCmd}`}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/14 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-400/22 hover:text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {session === "done" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <SquareTerminal className="h-3.5 w-3.5 text-emerald-200/70" />}
                  {session === "busy" ? "Launching…" : session === "done" ? "Session ready!" : session === "error" ? "Launch failed" : "Start Session"}
                </button>
                <button
                  type="button"
                  onClick={copySessionCmd}
                  title={`Copy: ${sessionCmd}`}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/78 transition hover:border-white/25 hover:bg-white/16 hover:text-white"
                >
                  {cmdCopied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Sparkles className="h-3.5 w-3.5 text-white/50" />}
                  {cmdCopied ? "Copied!" : "Copy session cmd"}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setFilingOpen((v) => !v)}
                    title="Pin this skill into a custom skill box"
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/78 transition hover:border-white/25 hover:bg-white/16 hover:text-white"
                  >
                    <FolderPlus className="h-3.5 w-3.5 text-white/50" />
                    File into
                    {pinnedLabel ? <span className="text-sky-200">· {pinnedLabel}</span> : null}
                    <ChevronDown className={`h-3 w-3 text-white/40 transition ${filingOpen ? "rotate-180" : ""}`} />
                  </button>
                  {filingOpen && (
                    <div className="absolute left-0 top-full z-30 mt-1.5 w-64 rounded-2xl border border-white/12 bg-slate-900/97 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
                      {customBoxes.length ? (
                        customBoxes.map((box) => (
                          <button
                            key={box.id}
                            type="button"
                            onClick={() => {
                              fileSkillInto(skill.name, box.id === pinnedFolderId ? null : box.id);
                              setFilingOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
                          >
                            <span className="truncate">{box.label}</span>
                            {box.id === pinnedFolderId && <Check className="h-3.5 w-3.5 shrink-0 text-sky-300" />}
                          </button>
                        ))
                      ) : (
                        <p className="px-2.5 py-1.5 text-xs text-white/45">No custom boxes yet — name one below.</p>
                      )}
                      {pinnedFolderId && (
                        <button
                          type="button"
                          onClick={() => {
                            fileSkillInto(skill.name, null);
                            setFilingOpen(false);
                          }}
                          className="mt-1 w-full rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold text-amber-200/80 transition hover:bg-white/10 hover:text-amber-100"
                        >
                          Unpin — return to automatic filing
                        </button>
                      )}
                      <div className="mt-1.5 border-t border-white/10 pt-1.5">
                        <input
                          autoFocus
                          value={newBoxName}
                          onChange={(e) => setNewBoxName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newBoxName.trim()) {
                              const box = createCustomFolder({ label: newBoxName.trim() });
                              fileSkillInto(skill.name, box.id);
                              setNewBoxName("");
                              setFilingOpen(false);
                            }
                            if (e.key === "Escape") setFilingOpen(false);
                          }}
                          placeholder="New box name + Enter…"
                          className="w-full rounded-xl border border-white/12 bg-white/6 px-2.5 py-1.5 text-sm font-medium text-white placeholder:text-white/35 focus:border-sky-300/45 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openSkillFolder(skill.id, "skill").catch(() => {})}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/78 transition hover:border-white/25 hover:bg-white/16 hover:text-white"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-white/50" />
                  Open in Finder
                </button>
                <button
                  type="button"
                  onClick={copyPath}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/78 transition hover:border-white/25 hover:bg-white/16 hover:text-white"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5 text-white/50" />}
                  {copied ? "Copied!" : "Copy path"}
                </button>
                {skill.has_reference ? (
                  <button
                    type="button"
                    onClick={() => openSkillFolder(skill.id, "references").catch(() => {})}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/78 transition hover:border-white/25 hover:bg-white/16 hover:text-white"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-white/50" />
                    References folder
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="detail-tile detail-code rounded-2xl p-3 sm:col-span-2 lg:col-span-3" style={tileBorder}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="font-ui text-[11px] font-bold uppercase tracking-[0.15em] text-white/36">File Path</div>
              <button
                type="button"
                onClick={copyPath}
                title="Copy file path"
                className="flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <code className="block select-text break-all rounded-xl bg-black/24 p-3 text-xs leading-5 text-sky-100/76">
              {skill.file_path}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SkillGrid({
  skills,
  selectedSkillId,
  onSelectSkill,
  favoriteIds = [],
  onToggleFavorite,
  relatedPool = [],
  onOpenRelated,
  onOpenFolder,
  onFilterCategory,
  onFilterProfile,
}) {
  if (!skills.length) {
    return (
      <section className="glass-panel flex min-h-[440px] items-center justify-center p-8 text-center">
        <div>
          <BookOpen className="mx-auto h-10 w-10 text-white/35" />
          <h2 className="mt-4 text-xl font-bold text-white">No skills found</h2>
          <p className="mt-2 text-sm font-medium text-white/55">Adjust the search, folder, subfolder, or profile filter.</p>
        </div>
      </section>
    );
  }

  const cols = useColumnCount();
  const selectedIndex = selectedSkillId
    ? skills.findIndex((skill) => skill.id === selectedSkillId)
    : -1;
  // The expanded panel slots in after the last card in the selected card's row,
  // so it always opens as a full-width drawer beneath that row.
  const rowEndIndex =
    selectedIndex >= 0
      ? Math.min(Math.floor(selectedIndex / cols) * cols + cols - 1, skills.length - 1)
      : -1;
  const selectedSkill = selectedIndex >= 0 ? skills[selectedIndex] : null;
  // Related skills come from the whole visible pool (not just this folder), so
  // chips can jump across skill boxes via onOpenRelated.
  const related = useMemo(
    () => (selectedSkill && relatedPool.length ? relatedSkills(selectedSkill, relatedPool, 8) : []),
    [selectedSkill, relatedPool],
  );
  const selectedVisual =
    selectedSkill &&
    getCategoryVisual(
      `${getPrimaryFolderId(selectedSkill)} ${displayFolderLabel(getPrimaryFolderId(selectedSkill))}`,
      selectedIndex,
    );

  return (
    <div className="min-h-[440px]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {skills.map((skill, index) => {
          const selected = selectedSkillId === skill.id;
          const isFavorite = favoriteIds.includes(skill.id);
          const primaryFolderId = getPrimaryFolderId(skill);
          const visual = getCategoryVisual(`${primaryFolderId} ${displayFolderLabel(primaryFolderId)}`, index);
          const Icon = visual.Icon;

          return (
            <Fragment key={`${skill.id}-${skill.file_path}`}>
              <button
                type="button"
                onClick={() => onSelectSkill(selected ? null : skill.id)}
                className={`skill-card flex flex-col rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "is-selected"
                    : "border-white/7 bg-black/16 hover:border-white/18 hover:bg-white/8"
                }`}
                style={{
                  ...(selected
                    ? {
                        borderTopColor: visual.rim,
                        borderRightColor: visual.rim,
                        borderBottomColor: visual.rim,
                        background: `repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px 1px, rgba(0,0,0,0.02) 1px 2px, transparent 2px 4px), ${PANEL_COLORS[visual.material] || "#ea580c"}`,
                        boxShadow: `0 0 24px ${visual.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
                      }
                    : {}),
                  borderLeftWidth: "3px",
                  borderLeftColor: visual.rim,
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg"
                    style={{ background: visual.gradient }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="block truncate text-base font-bold text-white">{titleize(skill.name)}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        {onToggleFavorite ? (
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(skill.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggleFavorite(skill.id);
                              }
                            }}
                            className={`favorite-star cursor-pointer rounded-md p-0.5 transition hover:bg-white/12 ${
                              isFavorite ? "text-amber-300" : "text-white/30 hover:text-white/70"
                            }`}
                          >
                            <Star className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
                          </span>
                        ) : null}
                        {skill.has_reference ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200/80" />
                        ) : null}
                      </div>
                    </div>
                    <span className="mt-1 block truncate text-xs font-semibold uppercase tracking-[0.12em] text-white/38">
                      {displayFolderLabel(primaryFolderId)} · {categoryLabel(skill.category)}
                    </span>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/58">
                  {skill.description || "No description in frontmatter."}
                </p>

                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  <ProfileBadges profiles={skill.profiles ?? [skill.profile]} />
                  <span className="shrink-0 text-xs font-medium text-white/38">Updated {relativeTime(skill.updated_at)}</span>
                </div>
              </button>

              {index === rowEndIndex && selectedSkill ? (
                <ExpandedCard
                  skill={selectedSkill}
                  visual={selectedVisual}
                  onClose={() => onSelectSkill(null)}
                  related={related}
                  onOpenRelated={onOpenRelated}
                  onOpenFolder={onOpenFolder}
                  onFilterCategory={onFilterCategory}
                  onFilterProfile={onFilterProfile}
                />
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
