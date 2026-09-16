// Hermes profile badge metadata. Known profiles get a hand-picked color pair;
// anything new falls back to a deterministic pick from the palette so badges
// stay colorful without a code change.
const PROFILE_META = {
  default: { label: "Default", short: "DF", className: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100" },
  dj: { label: "DJ", short: "DJ", className: "border-violet-300/30 bg-violet-400/15 text-violet-100" },
  hm: { label: "HM", short: "HM", className: "border-cyan-300/30 bg-cyan-400/15 text-cyan-100" },
  qa: { label: "QA", short: "QA", className: "border-rose-300/30 bg-rose-400/15 text-rose-100" },
  stock: { label: "Stock", short: "ST", className: "border-amber-300/30 bg-amber-400/15 text-amber-100" },
  cooperskitchen: { label: "Cooper's Kitchen", short: "CK", className: "border-orange-300/30 bg-orange-400/15 text-orange-100" },
  fantasy: { label: "Fantasy", short: "FA", className: "border-fuchsia-300/30 bg-fuchsia-400/15 text-fuchsia-100" },
  outreach: { label: "Outreach", short: "OU", className: "border-teal-300/30 bg-teal-400/15 text-teal-100" },
  video: { label: "Video", short: "VI", className: "border-red-300/30 bg-red-400/15 text-red-100" },
};

const PROFILE_ORDER = ["default", "dj", "hm", "qa", "stock", "cooperskitchen", "fantasy", "outreach", "video"];

const FALLBACK_STYLES = [
  "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
  "border-amber-300/30 bg-amber-400/15 text-amber-100",
  "border-rose-300/30 bg-rose-400/15 text-rose-100",
  "border-violet-300/30 bg-violet-400/15 text-violet-100",
  "border-cyan-300/30 bg-cyan-400/15 text-cyan-100",
  "border-sky-300/30 bg-sky-400/15 text-sky-100",
  "border-teal-300/30 bg-teal-400/15 text-teal-100",
  "border-fuchsia-300/30 bg-fuchsia-400/15 text-fuchsia-100",
];

export function sortProfiles(profiles = []) {
  return [...new Set(profiles)].sort((a, b) => {
    const ia = PROFILE_ORDER.indexOf(a);
    const ib = PROFILE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function badgeMeta(profile) {
  if (PROFILE_META[profile]) return PROFILE_META[profile];
  let hash = 0;
  for (const ch of profile) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    label: profile,
    short: profile.slice(0, 2).toUpperCase(),
    className: FALLBACK_STYLES[hash % FALLBACK_STYLES.length],
  };
}

export default function ProfileBadges({ profiles = [], className = "" }) {
  const list = sortProfiles(profiles);
  if (!list.length) return null;

  return (
    <span className={`flex flex-wrap items-center gap-1 ${className}`}>
      {list.map((profile) => {
        const meta = badgeMeta(profile);
        return (
          <span
            key={profile}
            title={meta.label}
            className={`inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-md border px-1.5 text-[10px] font-ui font-bold tracking-wide ${meta.className}`}
          >
            {meta.short}
          </span>
        );
      })}
    </span>
  );
}
