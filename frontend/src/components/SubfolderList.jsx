import { Boxes, Layers3 } from "lucide-react";
import { countLabel } from "../lib/format";
import FolderCard from "./FolderCard";

export default function SubfolderList({
  folder,
  folderId,
  subfolders,
  selectedSubfolderId,
  onSelectSubfolder,
  folderSkills,
}) {
  if (!folderId) {
    return (
      <section className="glass-panel flex min-h-[420px] items-center justify-center p-8 text-center">
        <div>
          <Layers3 className="mx-auto h-10 w-10 text-white/35" />
          <h2 className="font-heading mt-4 text-xl font-bold text-white">Pick a skill box</h2>
          <p className="mt-2 max-w-md text-sm font-medium leading-6 text-white/55">
            Select a skill box on the left to see its app groups here.
          </p>
        </div>
      </section>
    );
  }

  if (!subfolders.length) {
    return (
      <section className="glass-panel flex min-h-[420px] items-center justify-center p-8 text-center">
        <div>
          <Boxes className="mx-auto h-10 w-10 text-white/35" />
          <h2 className="font-heading mt-4 text-xl font-bold text-white">No app groups yet</h2>
          <p className="mt-2 max-w-md text-sm font-medium leading-6 text-white/55">
            This skill box has no app groups.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-ui text-xs font-bold uppercase tracking-[0.2em] text-white/48">
            {folder?.label || "Skill"} Apps
          </h2>
          <p className="mt-2 text-sm font-medium text-white/48">
            {countLabel(folderSkills.length)} across {subfolders.length} apps
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {subfolders.map((sub, index) => (
          <FolderCard
            key={sub.id}
            count={sub.count}
            folder={{
              id: sub.id,
              label: sub.label,
              description: `${sub.count} skill${sub.count !== 1 ? "s" : ""} in this app group`,
            }}
            index={index}
            active={selectedSubfolderId === sub.id}
            onClick={() => onSelectSubfolder(sub.id)}
          />
        ))}
      </div>
    </section>
  );
}
