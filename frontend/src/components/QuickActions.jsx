import { BarChart3, Download, Layers, PlusCircle, RefreshCw } from "lucide-react";

const disabledActions = [
  { label: "Add Skill", icon: PlusCircle },
  { label: "New Bundle", icon: Layers },
  { label: "Import Skills", icon: Download },
  { label: "View Analytics", icon: BarChart3 },
];

export default function QuickActions({ onSync, syncing, offline }) {
  return (
    <section className="glass-panel w-full max-w-[620px] px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-ui text-xs font-bold uppercase tracking-[0.18em] text-white/42">Quick Actions</h2>
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="font-ui inline-flex items-center gap-2 rounded-2xl border border-sky-300/20 bg-sky-400/14 px-3 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/22 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing" : "Sync Now"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {disabledActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              type="button"
              key={action.label}
              disabled
              title="Coming soon"
              className="flex h-24 cursor-not-allowed flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 bg-black/18 text-white/34 opacity-55 grayscale"
            >
              <Icon className="h-7 w-7" />
              <span className="font-ui text-sm font-semibold">{action.label}</span>
              <span className="font-ui text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">Soon</span>
            </button>
          );
        })}
      </div>

      {offline && (
        <p className="mt-3 text-xs font-medium text-amber-100/75">
          Backend offline. Sync will reconnect when `uvicorn server:app --reload --port 8000` is running.
        </p>
      )}
    </section>
  );
}
