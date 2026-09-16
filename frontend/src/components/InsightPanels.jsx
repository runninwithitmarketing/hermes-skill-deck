import { Activity, BookOpen, Database, FolderOpen, Moon, Palette, Sparkles, Star, Sun } from "lucide-react";
import { displayFolders, displayFolderLabel, getPrimaryFolderId } from "../lib/displayTaxonomy";
import { getCategoryVisual } from "../lib/categoryVisuals.jsx";
import { titleize } from "../lib/format";
import { openTarget } from "../lib/api";

function Stat({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="font-ui mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-white/42">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

export default function InsightPanels({ summary, topFolders, onOpenFolder, theme = "dark", onToggleTheme, favoriteSkills = [], onOpenSkill }) {
  const darkMode = theme !== "light";
  const sorted = [...topFolders].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...sorted.map((item) => item.count), 1);

  return (
    <aside className="insight-panels flex flex-col gap-4 xl:max-w-[390px]">
      <section className="glass-panel p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-ui text-xs font-bold uppercase tracking-[0.18em] text-white/48">Usage Overview</h2>
          <span className="font-ui rounded-full border border-white/8 bg-white/7 px-3 py-1 text-xs font-semibold text-white/50">
            Live Summary
          </span>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <Stat icon={Database} label="Total Skills" value={summary.total_skills ?? 0} />
          <Stat icon={Sparkles} label="Profiles" value={summary.profile_count ?? 0} />
          <Stat icon={Activity} label="Raw Categories" value={summary.category_count ?? 0} />
          <Stat icon={BookOpen} label="References" value={summary.reference_count ?? 0} />
        </div>

        {/* Favorites — replaces the old decorative UsageChart sparkline */}
        <div className="mt-6 border-t border-white/8 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-amber-300" fill="currentColor" />
            <h2 className="font-ui text-xs font-bold uppercase tracking-[0.18em] text-white/48">Favorites</h2>
          </div>
          {favoriteSkills.length ? (
            <div className="space-y-1.5">
              {favoriteSkills.map((skill, index) => {
                const primaryFolderId = getPrimaryFolderId(skill);
                const visual = getCategoryVisual(`${primaryFolderId} ${displayFolderLabel(primaryFolderId)}`, index);
                const Icon = visual.Icon;
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => onOpenSkill?.(skill)}
                    className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/8"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: visual.gradient }}
                    >
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/82">
                      {titleize(skill.name)}
                    </span>
                    <span className="shrink-0 truncate text-[11px] font-medium uppercase tracking-wide text-white/34">
                      {displayFolderLabel(primaryFolderId)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="px-2 text-sm leading-6 text-white/34">
              Star a skill to pin it here for quick access.
            </p>
          )}
        </div>
      </section>

      <section className="glass-panel p-6">
        <div className="mb-5">
          <h2 className="font-ui text-xs font-bold uppercase tracking-[0.18em] text-white/48">Top Skill Boxes</h2>
        </div>
        <div className="space-y-4">
          {sorted.slice(0, 5).map((folder) => {
            const stableIndex = displayFolders.findIndex((f) => f.id === folder.id);
            const visual = getCategoryVisual(`${folder.id} ${folder.label}`, Math.max(stableIndex, 0));
            const Icon = visual.Icon;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => onOpenFolder(folder.id)}
                className="w-full text-left transition hover:opacity-80"
              >
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm font-semibold text-white/82">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl" style={{ background: visual.gradient }}>
                      <Icon className="h-4 w-4 text-white" />
                    </span>
                    <span className="truncate">{folder.label}</span>
                  </span>
                  <span className="text-white/72">{folder.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/9">
                  <div
                    className="h-full rounded-full bg-sky-400"
                    style={{ width: `${Math.max(8, (folder.count / maxCount) * 100)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass-panel p-6">
        <div className="mb-5">
          <h2 className="font-ui text-xs font-bold uppercase tracking-[0.18em] text-white/48">Quick Access</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openTarget("db")}
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center transition hover:bg-white/[0.12] hover:border-white/20"
          >
            <Database className="h-5 w-5 text-amber-200/80" />
            <span className="font-ui text-xs font-semibold text-white/72">Skills database</span>
          </button>
          <button
            type="button"
            onClick={() => openTarget("hermes")}
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center transition hover:bg-white/[0.12] hover:border-white/20"
          >
            <FolderOpen className="h-5 w-5 text-sky-200/80" />
            <span className="font-ui text-xs font-semibold text-white/72">Hermes folder</span>
          </button>
          <button
            type="button"
            onClick={() => openTarget("profiles")}
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center transition hover:bg-white/[0.12] hover:border-white/20"
          >
            <Sparkles className="h-5 w-5 text-emerald-200/80" />
            <span className="font-ui text-xs font-semibold text-white/72">Profiles folder</span>
          </button>
          <button
            type="button"
            onClick={() => openTarget("skills")}
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center transition hover:bg-white/[0.12] hover:border-white/20"
          >
            <Palette className="h-5 w-5 text-violet-200/80" />
            <span className="font-ui text-xs font-semibold text-white/72">Skills folder</span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-pressed={!darkMode}
            className="col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center transition hover:bg-white/[0.12] hover:border-white/20"
          >
            {darkMode ? <Sun className="h-5 w-5 text-amber-200/80" /> : <Moon className="h-5 w-5 text-indigo-200/80" />}
            <span className="font-ui text-xs font-semibold text-white/72">{darkMode ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </section>
    </aside>
  );
}
