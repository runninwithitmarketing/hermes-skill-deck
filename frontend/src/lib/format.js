export const navLabels = [
  "SEO",
  "Content",
  "YouTube",
  "Video",
  "Coding",
  "Hermes Ops",
  "Automation",
  "Notion",
  "Stock",
  "Spotify",
  "News",
  "Bundles",
];

export function titleize(value = "") {
  if (!value) return "Uncategorized";
  const titled = value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return titled
    .replace(/\bSeo\b/g, "SEO")
    .replace(/\bMcp\b/g, "MCP")
    .replace(/\bMlops\b/g, "MLOps")
    .replace(/\bAi\b/g, "AI")
    .replace(/\bGithub\b/g, "GitHub")
    .replace(/\bYoutube\b/g, "YouTube")
    .replace(/\bGsap\b/g, "GSAP")
    .replace(/\bCss\b/g, "CSS")
    .replace(/\bCli\b/g, "CLI")
    .replace(/\bGpu\b/g, "GPU");
}

export function categoryLabel(value) {
  const title = titleize(value);
  if (/skills$/i.test(title) || title === "MCP Tools" || title === "Cron Jobs") {
    return title;
  }
  return `${title} Skills`;
}

export function countLabel(count, singular = "skill") {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export function relativeTime(value) {
  if (!value) return "Recently";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "Recently";

  const diffMs = Date.now() - then;
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export function filterSkills(skills, { search = "", category = null, profile = null } = {}) {
  const query = search.trim().toLowerCase();

  return skills.filter((skill) => {
    if (category && skill.category !== category) return false;
    if (profile && skill.profile !== profile) return false;
    if (!query) return true;

    const haystack = [skill.name, skill.description, skill.profile, skill.category]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function countByCategory(skills) {
  return Object.values(
    skills.reduce((acc, skill) => {
      const key = skill.category || "Uncategorized";
      acc[key] ||= { category: key, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

export function countByProfile(skills) {
  return Object.values(
    skills.reduce((acc, skill) => {
      const key = skill.profile || "default";
      acc[key] ||= { profile: key, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count || a.profile.localeCompare(b.profile));
}

export function sortRecent(skills) {
  return [...skills].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
}

export function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
