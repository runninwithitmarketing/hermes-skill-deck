const now = new Date();
const hoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

export const mockSkills = [
  {
    id: 1,
    name: "seo-audit",
    category: "SEO",
    description: "Audit websites for technical SEO, local SEO, schema, metadata, and AEO readiness.",
    profile: "default",
    file_path: "~/.hermes/skills/research/seo-audit/SKILL.md",
    has_reference: 1,
    created_at: hoursAgo(120),
    updated_at: hoursAgo(1),
  },
  {
    id: 2,
    name: "youtube-thumbnail-builder",
    category: "YouTube",
    description: "Create thumbnail briefs and production-ready image prompts for YouTube videos.",
    profile: "creator",
    file_path: "~/.hermes/profiles/creator/skills/youtube-thumbnail-builder/SKILL.md",
    has_reference: 0,
    created_at: hoursAgo(98),
    updated_at: hoursAgo(2),
  },
  {
    id: 3,
    name: "blog-brief-generator",
    category: "Content",
    description: "Turn keyword and audience notes into structured content briefs with outline guidance.",
    profile: "default",
    file_path: "~/.hermes/skills/content/blog-brief-generator/SKILL.md",
    has_reference: 1,
    created_at: hoursAgo(90),
    updated_at: hoursAgo(3),
  },
  {
    id: 4,
    name: "stock-rss-feeds",
    category: "Finance",
    description: "Track finance RSS feeds and summarize ticker-specific market updates.",
    profile: "stock",
    file_path: "~/.hermes/profiles/stock/skills/stock-rss-feeds/SKILL.md",
    has_reference: 0,
    created_at: hoursAgo(80),
    updated_at: hoursAgo(5),
  },
  {
    id: 5,
    name: "macos-system-management",
    category: "Utility",
    description: "Manage local macOS tasks with guarded terminal and system workflows.",
    profile: "default",
    file_path: "~/.hermes/skills/apple/macos-system-management/SKILL.md",
    has_reference: 0,
    created_at: hoursAgo(70),
    updated_at: hoursAgo(8),
  },
  {
    id: 6,
    name: "cron-job-management",
    category: "Automation",
    description: "Inspect, plan, and manage local scheduled jobs for Hermes workflows.",
    profile: "default",
    file_path: "~/.hermes/skills/devops/cron-job-management/SKILL.md",
    has_reference: 1,
    created_at: hoursAgo(62),
    updated_at: hoursAgo(12),
  },
  {
    id: 7,
    name: "kanban-orchestrator",
    category: "Agents",
    description: "Coordinate agent work items across staged kanban queues.",
    profile: "default",
    file_path: "~/.hermes/skills/devops/kanban-orchestrator/SKILL.md",
    has_reference: 0,
    created_at: hoursAgo(54),
    updated_at: hoursAgo(18),
  },
  {
    id: 8,
    name: "browser-harness",
    category: "MCP Tools",
    description: "Use a browser harness to test local web applications and collect UI evidence.",
    profile: "qa",
    file_path: "~/.hermes/profiles/qa/skills/browser-harness/SKILL.md",
    has_reference: 1,
    created_at: hoursAgo(42),
    updated_at: hoursAgo(24),
  },
  {
    id: 9,
    name: "daily-cron-digests",
    category: "Cron Jobs",
    description: "Generate recurring digest reports from local scheduled Hermes workflows.",
    profile: "default",
    file_path: "~/.hermes/skills/daily-cron-digests-on-deepseek/SKILL.md",
    has_reference: 0,
    created_at: hoursAgo(34),
    updated_at: hoursAgo(30),
  },
  {
    id: 10,
    name: "local-data-tools",
    category: "Utility",
    description: "Work with local files, SQLite databases, and structured data without cloud services.",
    profile: "default",
    file_path: "~/.hermes/skills/software-development/local-data-tools/SKILL.md",
    has_reference: 1,
    created_at: hoursAgo(24),
    updated_at: hoursAgo(35),
  },
];

export const mockCategories = Object.values(
  mockSkills.reduce((acc, skill) => {
    acc[skill.category] ||= { category: skill.category, count: 0 };
    acc[skill.category].count += 1;
    return acc;
  }, {}),
);

export const mockProfiles = Object.values(
  mockSkills.reduce((acc, skill) => {
    acc[skill.profile] ||= { profile: skill.profile, count: 0 };
    acc[skill.profile].count += 1;
    return acc;
  }, {}),
);

export const mockSummary = {
  total_skills: mockSkills.length,
  profile_count: mockProfiles.length,
  category_count: mockCategories.length,
  reference_count: mockSkills.filter((skill) => skill.has_reference).length,
};
