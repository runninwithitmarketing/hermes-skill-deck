import { FolderOpen, Layers } from "lucide-react";
import MagneticMenu from "./MagneticMenu";

function RailButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-mag
      className={`relative z-10 flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left font-ui text-sm font-semibold transition ${
        active ? "text-white" : "text-white/58 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function RailTitle({ icon: Icon, children }) {
  return (
    <div className="font-ui mb-4 flex items-center gap-3 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
      <Icon className="h-4 w-4" />
      {children}
    </div>
  );
}

function Count({ children }) {
  return <span className="font-ui shrink-0 rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-bold text-white/42">{children}</span>;
}

export default function Sidebar({ folders, selectedFolderId, onSelectFolder, totalSkills }) {
  return (
    <aside className="panel-pop glass-panel flex flex-col overflow-hidden p-4 self-start lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)]">
      <RailTitle icon={FolderOpen}>Skills</RailTitle>
      <MagneticMenu
        className="relative scroll-fade min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
        radius="row"
      >
        <RailButton active={!selectedFolderId} onClick={() => onSelectFolder(null)}>
          <span className="flex min-w-0 items-center gap-2">
            <Layers className="h-4 w-4 shrink-0" />
            <span className="truncate">All</span>
          </span>
          <Count>{totalSkills}</Count>
        </RailButton>
        {folders.map((folder) => (
          <RailButton key={folder.id} active={selectedFolderId === folder.id} onClick={() => onSelectFolder(folder.id)}>
            <span className="truncate">{folder.label}</span>
            <Count>{folder.count}</Count>
          </RailButton>
        ))}
      </MagneticMenu>
    </aside>
  );
}
