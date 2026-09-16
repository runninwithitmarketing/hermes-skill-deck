import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, RotateCcw, X } from "lucide-react";
import { marked } from "marked";
import { titleize } from "../lib/format";
import { fetchSkillContent } from "../lib/api";
import ProfileBadges from "./ProfileBadges";

// marked v18 parses synchronously when no async extensions are configured.
marked.setOptions({ gfm: true, breaks: true });

export default function SkillMarkdownPanel({ skill, onClose }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!skill?.id) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSkillContent(skill.id)
      .then((data) => {
        if (cancelled) return;
        setContent(typeof data?.body === "string" ? data.body : "");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load the skill markdown.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [skill?.id, reloadKey]);

  const html = useMemo(() => (content ? marked.parse(content) : ""), [content]);

  if (!skill) return null;

  return (
    <aside className="panel-pop panel-pop-3 flex min-w-0 flex-col self-start rounded-2xl border border-white/10 bg-black/30">
      <header className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/8">
            <FileText className="h-4 w-4 text-sky-200" />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading truncate text-base font-bold text-white" title={titleize(skill.name)}>
              {titleize(skill.name)}
            </h2>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/38">
              <span>SKILL.md</span>
              <ProfileBadges profiles={skill.profiles ?? [skill.profile]} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="Reload markdown"
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/24 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Close markdown view"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/24 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="md-scroll max-h-[calc(100vh-15rem)] overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm font-medium text-white/55">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading markdown
          </div>
        ) : error ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-rose-200/80">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/14"
            >
              Try again
            </button>
          </div>
        ) : html ? (
          <div className="md-body text-sm" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="mt-8 text-center text-sm font-medium text-white/45">
            This SKILL.md has no body beyond its frontmatter.
          </p>
        )}
      </div>
    </aside>
  );
}
