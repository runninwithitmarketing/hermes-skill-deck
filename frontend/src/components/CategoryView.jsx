import { ArrowLeft, Box, X } from "lucide-react";
import { countLabel } from "../lib/format";
import FolderCard from "./FolderCard";
import Sidebar from "./Sidebar";
import SkillGrid from "./SkillGrid";
import SkillMarkdownPanel from "./SkillMarkdownPanel";

export default function CategoryView({
  folders,
  folderBaseSkills,
  onBack,
  onSelectFolder,
  onSelectSubfolder,
  selectedFolder,
  selectedFolderId,
  selectedSubfolderId,
  subfolders,
  totalSkills,
  currentSkills,
  selectedSkillId,
  onSelectSkill,
  favoriteNames,
  onToggleFavorite,
  allSkills = [],
  onOpenSkill,
  onOpenFolder,
  onFilterCategory,
  onFilterProfile,
  search = "",
  onClearSearch,
}) {
  // A folder only drills into subfolders when it has 2+ groups. Otherwise the
  // grid would be a single pointless card, so we jump straight to its skills.
  const hasSubGrid = subfolders.length >= 2;
  const showSkills = !hasSubGrid || Boolean(selectedSubfolderId);
  const activeSub = selectedSubfolderId
    ? subfolders.find((sub) => sub.id === selectedSubfolderId)
    : null;

  const title = selectedFolder?.label || "All Skills";
  const description =
    selectedFolder?.description || "Browse every synced Hermes skill across skill boxes and app groups.";

  // The markdown sidebar shows for the selected skill. Below xl it flows under
  // the grid as a full-width block; at xl+ it becomes a third column.
  const selectedSkill = selectedSkillId
    ? currentSkills.find((skill) => skill.id === selectedSkillId)
    : null;
  const gridClass = selectedSkill
    ? "grid gap-4 lg:grid-cols-[220px_minmax(280px,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_380px] 2xl:grid-cols-[240px_minmax(0,1fr)_420px]"
    : "grid gap-4 lg:grid-cols-[260px_minmax(400px,1fr)] 2xl:grid-cols-[300px_minmax(500px,1fr)]";

  const eyebrow = showSkills && activeSub ? activeSub.label : "Skill box open";
  const countText = showSkills
    ? `${countLabel(currentSkills.length)} visible`
    : `${countLabel(folderBaseSkills.length)} across ${subfolders.length} groups`;

  // Header arrow steps back one level: skills -> subfolder grid -> desktop.
  const handleBack = () => {
    if (hasSubGrid && selectedSubfolderId) {
      onSelectSubfolder(null);
    } else {
      onBack();
    }
  };

  return (
    <main className="detail-stage relative z-10 px-5 pb-48 pt-20 sm:px-8 lg:px-10">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/24 text-white/76 transition hover:bg-white/10 hover:text-white"
            title={hasSubGrid && selectedSubfolderId ? "Back to groups" : "Back to desktop"}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="font-ui mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-100/50">
              <Box className="h-4 w-4" />
              {eyebrow}
            </div>
            <h1 className="font-heading truncate text-3xl font-bold text-white md:text-4xl">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-white/58">{description}</p>
            <p className="mt-1 text-sm font-semibold text-white/48">{countText}</p>
            {search.trim() ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sky-200/20 bg-sky-300/12 px-3 py-1 text-sm font-semibold text-sky-100">
                Filter: &ldquo;{search.trim()}&rdquo;
                {onClearSearch && (
                  <button
                    type="button"
                    title="Clear filter"
                    onClick={onClearSearch}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-sky-100/60 transition hover:bg-sky-100/20 hover:text-sky-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className={gridClass}>
        <Sidebar
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          totalSkills={totalSkills}
        />

        <div className="panel-pop panel-pop-1 flex min-w-0 flex-col">
          {showSkills ? (
            <>
              {hasSubGrid ? (
                <div className="mb-4 flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => onSelectSubfolder(null)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/24 px-3 py-1.5 font-semibold text-white/68 transition hover:bg-white/10 hover:text-white"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All groups
                  </button>
                  <span className="text-white/30">/</span>
                  <span className="font-semibold text-white">{activeSub?.label}</span>
                </div>
              ) : null}

              <SkillGrid
                skills={currentSkills}
                selectedSkillId={selectedSkillId}
                onSelectSkill={onSelectSkill}
                favoriteNames={favoriteNames}
                onToggleFavorite={onToggleFavorite}
                relatedPool={allSkills}
                onOpenRelated={onOpenSkill}
                onOpenFolder={onOpenFolder}
                onFilterCategory={onFilterCategory}
                onFilterProfile={onFilterProfile}
              />
            </>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 2xl:grid-cols-4">
              {subfolders.map((sub, index) => (
                <FolderCard
                  key={sub.id}
                  count={sub.count}
                  folder={{
                    id: sub.id,
                    label: sub.label,
                    description: `${sub.count} skill${sub.count !== 1 ? "s" : ""} in this group`,
                  }}
                  index={index}
                  active={selectedSubfolderId === sub.id}
                  onClick={() => onSelectSubfolder(sub.id)}
                />
              ))}
            </div>
          )}
        </div>

        {selectedSkill ? (
          <div className="lg:col-span-2 xl:col-span-1">
            <SkillMarkdownPanel skill={selectedSkill} onClose={() => onSelectSkill(null)} />
          </div>
        ) : null}
      </div>
    </main>
  );
}
