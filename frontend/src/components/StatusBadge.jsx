import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";

export default function StatusBadge({ offline, syncing }) {
  const Icon = syncing ? RefreshCw : offline ? XCircle : CheckCircle2;
  const label = syncing ? "Hermes Syncing" : offline ? "Hermes Offline" : "Hermes Connected";
  const detail = offline ? "Showing demo data" : syncing ? "Refreshing skill index" : "Local backend online";

  return (
    <div className="fixed right-5 top-16 z-40 rounded-3xl border border-white/12 bg-black/35 px-5 py-3 text-white shadow-glass backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            offline ? "bg-rose-500/18 text-rose-200" : "bg-emerald-400/18 text-emerald-200"
          }`}
        >
          <Icon className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
        </span>
        <span>
          <span className="font-ui block text-sm font-bold">{label}</span>
          <span className="font-ui block text-xs font-medium text-white/62">{detail}</span>
        </span>
      </div>
    </div>
  );
}
