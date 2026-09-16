const lc = (value = "") => String(value || "").toLowerCase();

function matchBlob(skill) {
  return [skill.name, skill.category, skill.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function searchBlob(skill) {
  return [skill.name, skill.category, skill.profile, skill.description, skill.file_path]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesDefinition(skill, definition = {}) {
  const name = lc(skill.name);
  const category = lc(skill.category || "uncategorized");
  const haystack = matchBlob(skill);

  if (definition.names?.some((item) => name === lc(item) || name.includes(lc(item)))) return true;
  if (definition.categories?.some((item) => category === lc(item))) return true;
  if (definition.categoryIncludes?.some((item) => category.includes(lc(item)))) return true;
  if (definition.keywords?.some((pattern) => pattern.test(haystack))) return true;

  return false;
}

function definitionPriority(skill, definition = {}) {
  const name = lc(skill.name);
  const category = lc(skill.category || "uncategorized");
  const haystack = matchBlob(skill);
  let score = 0;

  if (definition.names?.some((item) => name === lc(item))) score += 1000;
  if (definition.names?.some((item) => name.includes(lc(item)))) score += 400;
  if (definition.categories?.some((item) => category === lc(item))) score += 300;
  if (definition.categoryIncludes?.some((item) => category.includes(lc(item)))) score += 120;
  if (definition.keywords) score += definition.keywords.filter((pattern) => pattern.test(haystack)).length * 30;

  return score;
}

export const displayFolders = [
  {
    id: "seo",
    label: "SEO",
    shortLabel: "SEO",
    description: "Audits, rankings reports, and AEO/LLM visibility for marketing clients.",
    categories: ["seo"],
    names: [
      "seo-audit", "content-audit", "lighthouse-audit", "client-marketing-audit", "hm-redirect-mapping-verification", "jpm-redirect-mapping-verification",
      "seo-rankings-report",
      "llm-visibility-audit", "llms-txt-enhancement", "answer-engine-optimization",
      "hm-meta-audit", "jpm-meta-audit",
      "hm-meta-title-description-edits", "jpm-meta-title-description-edits",
      "hm-page-rebuild", "jpm-page-rebuild",
      "hm-staging-site-audit", "jpm-staging-site-audit",
      "hm-web-page-review", "jpm-web-page-review",
      "sitewide-meta-audit-tools",
    ],
    keywords: [/\bseo\b|rankings?|keyword|audit|aeo|llm visibility|content audit|serp|lighthouse|redirect/i],
    subfolders: [
      { id: "audits", label: "Audits", names: ["seo-audit", "content-audit", "lighthouse-audit", "client-marketing-audit", "hm-redirect-mapping-verification", "jpm-redirect-mapping-verification", "hm-staging-site-audit", "jpm-staging-site-audit", "hm-web-page-review", "jpm-web-page-review"], keywords: [/audit|lighthouse|redirect|staging|web page review/i] },
      { id: "rankings", label: "Rankings & Reports", names: ["seo-rankings-report"], keywords: [/ranking|report|serp/i] },
      { id: "aeo", label: "AEO / Visibility", names: ["llm-visibility-audit", "llms-txt-enhancement", "answer-engine-optimization"], keywords: [/aeo|llm visibility|answer engine|llms\.txt/i] },
      { id: "onpage", label: "On-Page / Meta", names: ["hm-meta-audit", "jpm-meta-audit", "hm-meta-title-description-edits", "jpm-meta-title-description-edits", "hm-page-rebuild", "jpm-page-rebuild", "sitewide-meta-audit-tools"], keywords: [/meta|on-?page|title description|page rebuild/i] },
    ],
  },
  {
    id: "agency",
    label: "Agency",
    shortLabel: "Agency",
    description: "Client work — case studies, discovery, lead generation, and monthly client reporting.",
    names: [
      "client-case-study", "client-discovery-research", "inbound-opportunity-vetting", "b2b-lead-generation",
      "hm-monthly-client-reporting", "jpm-monthly-client-reporting",
      "cci-content", "cci-industry-page-build", "client-invoice-documents", "petdex",
    ],
    keywords: [/case study|discovery|opportunity|lead generation|client reporting|monthly client|\bagency\b|client work|cci-|invoice|petdex/i],
    subfolders: [
      { id: "client-work", label: "Client Work", names: ["client-case-study", "client-discovery-research", "inbound-opportunity-vetting", "b2b-lead-generation", "cci-content", "cci-industry-page-build", "client-invoice-documents", "petdex"], keywords: [/case study|discovery|opportunity|lead|cci-|invoice|petdex/i] },
      { id: "reporting", label: "Client Reporting", names: ["hm-monthly-client-reporting", "jpm-monthly-client-reporting"], keywords: [/monthly|report|client reporting/i] },
    ],
  },
  {
    id: "writing",
    label: "Writing",
    shortLabel: "Writing",
    description: "Copywriting, blogs, email drafts, ideation, WordPress publishing, documents, and decks.",
    names: [
      "Email Drafts", "humanizer", "ideation",
      "wordpress", "wordpress-post-management",
      "document-creation", "ocr-and-documents", "powerpoint", "claude-design",
      "hm-content-writing", "jpm-content-writing", "hm-content-editing", "jpm-content-editing",
      "hm-blog-draft-review", "jpm-blog-draft-review",
      "docx", "pdf", "xlsx", "nano-pdf", "teams-meeting-pipeline",
    ],
    keywords: [/content|writing|blog|brief|article|copy|humanizer|email draft|ideation|wordpress|wp-cli|document|powerpoint|deck|slides|ocr|docx|xlsx|\bpdf\b|teams meeting/i],
    subfolders: [
      { id: "copy", label: "Writing & Copy", names: ["Email Drafts", "humanizer", "ideation", "hm-content-writing", "jpm-content-writing", "hm-content-editing", "jpm-content-editing", "hm-blog-draft-review", "jpm-blog-draft-review"], keywords: [/copy|writing|humanizer|email|ideation|brief|blog|article|content writing|content editing/i] },
      { id: "wordpress", label: "WordPress", names: ["wordpress", "wordpress-post-management"], keywords: [/wordpress|wp-cli|publishing/i] },
      { id: "docs", label: "Docs & Decks", names: ["document-creation", "ocr-and-documents", "powerpoint", "claude-design", "docx", "pdf", "xlsx", "nano-pdf", "teams-meeting-pipeline"], keywords: [/document|powerpoint|pdf|deck|slides|ocr|docx|xlsx|teams meeting/i] },
    ],
  },
  {
    id: "creative",
    label: "Creative",
    shortLabel: "Creative",
    description: "Diagrams, generative art, HyperFrames, animation, video editing, audio, and production.",
    categories: ["creative", "hyperframes", "hyperframes-cli", "hyperframes-media", "remotion-to-hyperframes", "css-animations", "gsap", "lottie", "waapi", "animejs", "three", "typegpu", "media"],
    names: ["kanban-video-orchestrator", "website-to-hyperframes"],
    keywords: [/diagram|excalidraw|sketch|wireframe|design|ascii|pixel|infographic|comic|illustrator|comfyui|p5js|manim|generative|video|hyperframes|remotion|ffmpeg|clip|animation|media production|dead-time|lottie|gsap|waapi|webgpu|three\.js|audio transcription/i],
    subfolders: [
      { id: "diagrams", label: "Diagrams & Design", names: ["architecture-diagram", "excalidraw", "design-md", "sketch", "pretext", "popular-web-designs"], keywords: [/diagram|excalidraw|sketch|wireframe|design/i] },
      { id: "art", label: "Generative Art", names: ["ascii-art", "ascii-video", "pixel-art", "baoyu-infographic", "baoyu-comic", "baoyu-article-illustrator", "comfyui", "p5js", "manim-video", "touchdesigner-mcp", "aspect-ratio-adaptation"], keywords: [/ascii|pixel|infographic|comic|illustrator|comfyui|p5js|manim|generative/i] },
      { id: "hyperframes", label: "HyperFrames", names: ["hyperframes", "hyperframes-cli", "hyperframes-media", "hyperframes-registry", "remotion-to-hyperframes", "website-to-hyperframes", "contribute-catalog"], keywords: [/hyperframes|remotion/i] },
      { id: "animation", label: "Animation", names: ["animejs", "css-animations", "gsap", "lottie", "three", "typegpu", "waapi"], keywords: [/animation|gsap|lottie|waapi|anime|three|webgpu|css/i] },
      { id: "editing", label: "Editing", names: ["video-editing", "video-dead-time-cutter", "media-processing", "cooking-video-clip-spotter", "gif-search"], keywords: [/ffmpeg|clip|dead-time|media-processing|trim/i] },
      { id: "audio", label: "Audio & Transcription", names: ["audio-transcription"], keywords: [/audio|transcription|spectrogram|songsee/i] },
      { id: "production", label: "Production Orchestration", names: ["media-production", "kanban-video-orchestrator"], keywords: [/production|orchestrator|kanban-video/i] },
    ],
  },
  {
    id: "youtube",
    label: "YouTube",
    shortLabel: "YouTube",
    description: "Scripts, transcripts, titles, descriptions, thumbnails, repurposing, and publishing helpers.",
    keywords: [/youtube|thumbnail|transcript|video script|titles? & description|crosspost|tiktok/i],
    names: ["youtube-content", "youtube-skills", "tiktok-to-youtube-crosspost"],
    subfolders: [
      { id: "scripts", label: "Scripts", keywords: [/script|outline|storyboard/i] },
      { id: "metadata", label: "Titles & Descriptions", keywords: [/title|description|metadata|tags/i] },
      { id: "transcripts", label: "Transcripts", keywords: [/transcript|summary|youtube-content/i] },
      { id: "crosspost", label: "Crosspost", keywords: [/crosspost|tiktok/i] },
    ],
  },
  {
    id: "coding",
    label: "Coding",
    shortLabel: "Coding",
    description: "Coding agents, GitHub, debugging, testing, plans, and hands-on implementation.",
    categories: ["software-development", "github"],
    names: ["codex", "claude-code", "opencode", "kanban-codex-lane", "debugger-tools", "tailwind", "terminal-output", "dogfood", "vision-tool-support", "coding-agent-orchestration", "computer-use"],
    keywords: [/\bcodex\b|claude-code|opencode|github|\brepo\b|repository|pull request|debug|test-driven|tdd|web app|browser harness|cdp|codebase|implementation plan|software/i],
    subfolders: [
      { id: "agents", label: "Coding Agents", names: ["codex", "claude-code", "opencode", "kanban-codex-lane"], keywords: [/\bcodex\b|claude-code|opencode|coding agent/i] },
      { id: "github", label: "GitHub", names: ["github", "github-auth", "github-issues", "github-pr-workflow", "github-repo-management", "github-code-review", "codebase-inspection", "requesting-code-review"], categories: ["github"], keywords: [/github|pull request|code review/i] },
      { id: "debugging", label: "Debugging", names: ["code-debugging", "systematic-debugging", "debugger-tools", "node-inspect-debugger", "python-debugpy", "debugging-hermes-tui-commands", "debugging-tui-layout"], keywords: [/debug/i] },
      { id: "testing", label: "Testing & QA", names: ["test-driven-development", "web-application-testing", "browser-harness", "cdp-browser-automation", "dogfood", "vision-tool-support"], keywords: [/test|tdd|browser|dogfood|\bqa\b/i] },
      { id: "planning", label: "Plans", names: ["plan", "writing-plans", "development-preparation", "subagent-driven-development", "spike"], keywords: [/plan|preparation|spike/i] },
      { id: "implementation", label: "Implementation", names: ["frontend-ui-workflow", "ui-polish", "simplify-code", "ai-chat-integration", "api-credential-management", "local-data-tools", "hermes-s6-container-supervision", "tailwind", "terminal-output"], keywords: [/frontend|refactor|implement|integration/i] },
    ],
  },
  {
    id: "hermes-ops",
    label: "Hermes Ops",
    shortLabel: "Hermes Ops",
    description: "Hermes Agent, desktop app, profiles, provider setup, MCP, Kanban, cron, gateway, and skill maintenance.",
    categories: ["devops", "mcp"],
    names: ["hermes-agent", "hermes-desktop-app", "native-mcp", "cron-job-management", "kanban-orchestrator", "kanban-worker", "hermes-agent-skill-authoring", "hermes-desktop-extending", "hermes-profile-management", "hermes-desktop-plugins", "hermes-themes"],
    keywords: [/hermes|profile|provider|gateway|kanban|cron|mcp|skill author|skill-bundles|webhook|s6/i],
    subfolders: [
      { id: "agent", label: "Hermes Agent", keywords: [/hermes-agent|desktop app|provider|profile|gateway/i] },
      { id: "kanban", label: "Kanban", keywords: [/kanban/i] },
      { id: "cron", label: "Cron & Webhooks", keywords: [/cron|webhook|scheduler/i] },
      { id: "mcp", label: "MCP", categories: ["mcp"], keywords: [/mcp|native-mcp/i] },
      { id: "skills", label: "Skills", keywords: [/skill author|skill-bundles|bundle/i] },
    ],
  },
  {
    id: "automation-integrations",
    label: "Automation & Integrations",
    shortLabel: "Automation",
    description: "Google Workspace, Airtable, Linear, email, Apple apps, social APIs, smart home, and platform integrations.",
    categories: ["email", "apple", "smart-home", "social-media", "yuanbao"],
    keywords: [/automation|integration|google workspace|airtable|linear|gmail|calendar|drive|email|himalaya|apple|reminders|notes|imessage|webhook|spotify|smart home|hue|yuanbao|telegram|discord|scheduler/i],
    names: ["google-workspace", "airtable", "linear"],
    subfolders: [
      { id: "workspace", label: "Workspace Apps", keywords: [/google|gmail|calendar|drive|docs|sheets|airtable|linear|notion/i] },
      { id: "messaging", label: "Messaging", keywords: [/email|himalaya|imessage|telegram|discord|yuanbao|xurl|twitter/i] },
      { id: "apple", label: "Apple / macOS", categories: ["apple"], keywords: [/apple|macos|notes|reminders|imessage/i] },
      { id: "smart-home", label: "Smart Home", categories: ["smart-home"], keywords: [/hue|smart home|openhue/i] },
    ],
  },
  {
    id: "notion",
    label: "Notion",
    shortLabel: "Notion",
    description: "Notion API, briefs, daily briefing, HM client hubs, meeting notes, reporting, and data infrastructure.",
    names: ["notion", "daily-notion-briefing", "hm-notion-client-hub-setup", "jpm-notion-client-hub-setup", "hm-data-infrastructure"],
    keywords: [/notion|meeting notes|client hub|daily notion|hm-notion|content library|pipeline/i],
    subfolders: [
      { id: "api", label: "API & Databases", keywords: [/notion api|database|data source|hm-data/i] },
      { id: "briefing", label: "Briefings", keywords: [/daily notion|briefing/i] },
      { id: "client-hubs", label: "Client Hubs", keywords: [/client hub|hm-notion|monthly client/i] },
      { id: "meetings", label: "Meeting Notes", keywords: [/meeting notes/i] },
    ],
  },
  {
    id: "stock-markets",
    label: "Stock & Markets",
    shortLabel: "Stock",
    description: "Stock Partna, market feeds, Polymarket, Operator Finance, and market discovery workflows.",
    categories: ["stock-agent"],
    names: ["stock-agent", "stock-rss-feeds", "polymarket", "operator-finance-benchmark", "under-the-radar-market-search"],
    keywords: [/\bstock\b|\bmarkets?\b|\bfinance\b|\btrading\b|polymarket|operator finance|rss feeds?|equities|portfolio/i],
    subfolders: [
      { id: "stock-agent", label: "Stock Agent", names: ["stock-agent"], keywords: [/stock partna|stock-agent/i] },
      { id: "feeds", label: "Market Feeds", names: ["stock-rss-feeds"], keywords: [/rss|feed|bloomberg|marketwatch/i] },
      { id: "prediction", label: "Prediction Markets", names: ["polymarket"], keywords: [/polymarket|prediction/i] },
      { id: "operator-finance", label: "Operator Finance", keywords: [/operator finance|finance benchmark/i] },
    ],
  },
  {
    id: "spotify-music",
    label: "Spotify & Music",
    shortLabel: "Spotify",
    description: "Spotify control, DJ workflows, music generation, songwriting, spectrograms, and audio curation.",
    categories: ["spotify"],
    names: ["spotify", "spotify-dj", "heartmula", "songwriting-and-ai-music", "songsee", "audiocraft-audio-generation"],
    keywords: [/spotify|music|song|suno|heartmula|songsee|spectrogram|audio generation|musicgen|playlist|dj|melodic/i],
    subfolders: [
      { id: "spotify", label: "Spotify", names: ["spotify", "spotify-dj"], keywords: [/spotify|playlist|queue|dj/i] },
      { id: "generation", label: "Music Generation", keywords: [/suno|heartmula|musicgen|audiocraft|songwriting/i] },
      { id: "analysis", label: "Audio Analysis", keywords: [/songsee|spectrogram|mfcc|chroma|audio/i] },
    ],
  },
  {
    id: "news-feeds",
    label: "News & Feeds",
    shortLabel: "News",
    description: "News digests, blog/RSS monitoring, daily cron digests, and content monitoring feeds.",
    categories: ["daily-cron-digests-on-deepseek"],
    names: ["news-digest", "blogwatcher", "daily-cron-digests-on-deepseek", "stock-rss-feeds"],
    keywords: [/news|digest|rss|atom|feed|blogwatcher|monitor blogs?|daily cron|content monitoring/i],
    subfolders: [
      { id: "digests", label: "Digests", keywords: [/digest|briefing|daily cron/i] },
      { id: "rss", label: "RSS / Feeds", keywords: [/rss|atom|feed/i] },
      { id: "monitoring", label: "Monitoring", keywords: [/monitor|watcher|blogwatcher/i] },
    ],
  },
  {
    id: "data-ml",
    label: "Data & ML",
    shortLabel: "Data & ML",
    description: "Data science, Jupyter, Hugging Face, LLM evaluation, inference, fine-tuning, and ML research workflows.",
    categories: ["data-science", "mlops", "mlops/evaluation", "mlops/inference", "mlops/models", "mlops/research", "mlops/training"],
    names: ["llm-cost-analysis"],
    keywords: [/jupyter|data science|huggingface|llm eval|vllm|llama\.cpp|dspy|fine-tun|axolotl|trl|unsloth|wandb|weights/i],
    subfolders: [
      { id: "data-science", label: "Data Science", categories: ["data-science"], keywords: [/jupyter|csv|analysis/i] },
      { id: "evaluation", label: "Evaluation", names: ["llm-cost-analysis"], keywords: [/eval|benchmark|harness|cost/i] },
      { id: "inference", label: "Inference", names: ["outlines"], keywords: [/vllm|llama|serving|inference|gguf|structured/i] },
      { id: "training", label: "Training", keywords: [/fine-tun|axolotl|trl|unsloth|lora|qlora/i] },
      { id: "research", label: "ML Research", names: ["obliteratus"], keywords: [/dspy|research|model|segment/i] },
    ],
  },
  {
    id: "research",
    label: "Research",
    shortLabel: "Research",
    description: "Academic, market, SERP, apartment, client, map, and general reconnaissance workflows.",
    categories: ["research"],
    names: ["tor", "maps"],
    keywords: [/research|arxiv|serp|apartment|market|maps|tor|client discovery|polymarket|seo-rankings|wiki/i],
    subfolders: [
      { id: "academic", label: "Academic", keywords: [/arxiv|paper|literature/i] },
      { id: "serp", label: "SERP / SEO Research", keywords: [/serp|keyword|rankings|search/i] },
      { id: "market", label: "Market Research", keywords: [/market|client|apartment|lead|polymarket/i] },
      { id: "reference", label: "Reference Tools", keywords: [/maps|tor|wiki/i] },
    ],
  },
  {
    id: "skill-bundles",
    label: "Skill Bundles",
    shortLabel: "Bundles",
    description: "Reusable grouped skill packs for YouTube, SEO, coding, Notion, video, stock, and news workflows.",
    names: ["skill-bundles"],
    categoryIncludes: ["bundle"],
    keywords: [/skill bundle|skill-bundles|bundle/i],
    subfolders: [
      { id: "workflow-bundles", label: "Workflow Bundles", keywords: [/bundle|pack|workflow/i] },
    ],
  },
  {
    id: "personal-utilities",
    label: "Personal & Utilities",
    shortLabel: "Utilities",
    description: "Mac utilities, gaming, smart one-offs, creative experiments, and everything that does not need its own command-center lane yet.",
    categories: ["gaming", "dogfood", "note-taking", "vision-tool-support", "terminal-output", "red-teaming"],
    names: ["session-cleaner", "session-navigation", "session-reader", "tui-widgets", "hm-infrastructure", "explaining-project-state", "user-communication"],
    keywords: [/gaming|pokemon|minecraft|macos|apple|notes|obsidian|terminal output|vision|dogfood|utility|personal|tor|session|tui|infrastructure|communication/i],
    fallback: true,
    subfolders: [
      { id: "mac", label: "Mac & Notes", keywords: [/macos|apple|notes|obsidian/i] },
      { id: "gaming", label: "Gaming", categories: ["gaming"], keywords: [/pokemon|minecraft|gaming/i] },
      { id: "qa", label: "QA / Vision", keywords: [/dogfood|vision|testing|qa/i] },
      { id: "misc", label: "Misc Utilities", names: ["session-cleaner", "session-navigation", "session-reader", "tui-widgets", "hm-infrastructure", "explaining-project-state", "user-communication"], keywords: [/terminal output|utility|personal|tor|session|tui|infrastructure|communication/i] },
    ],
  },
];

const folderById = new Map(displayFolders.map((folder) => [folder.id, folder]));

// ── Custom skill boxes ────────────────────────────────────────────────────────
// User-created boxes live in localStorage alongside the built-in sixteen. A
// custom box can carry a category rule ("every skill whose raw category is
// fantasy-football belongs here"), so future syncs file matching skills into it
// automatically — the rule is what the user approved, not folder auto-spawning.
// A per-skill membership pin (File into) beats the rules for one-offs.
const CUSTOM_FOLDERS_KEY = "custom-folders";
const FOLDER_MEMBERSHIP_KEY = "folder-membership";
const TAXONOMY_EVENT = "skilldeck-taxonomy-changed";

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function notifyTaxonomyChanged() {
  window.dispatchEvent(new CustomEvent(TAXONOMY_EVENT));
}

export function loadCustomFolders() {
  const list = readJson(CUSTOM_FOLDERS_KEY, []);
  return Array.isArray(list) ? list.filter((f) => f && f.id && f.label) : [];
}

export function loadMemberships() {
  const map = readJson(FOLDER_MEMBERSHIP_KEY, {});
  return map && typeof map === "object" ? map : {};
}

function slugifyFolderId(label) {
  const slug = String(label || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `custom-${slug || Date.now().toString(36)}`;
}

export function createCustomFolder({ label, category = "", description = "" }) {
  const folders = loadCustomFolders();
  let id = slugifyFolderId(label);
  const taken = new Set([...folders.map((f) => f.id), ...displayFolders.map((f) => f.id)]);
  let n = 2;
  while (taken.has(id)) id = `${slugifyFolderId(label)}-${n++}`;
  const folder = {
    id,
    label: String(label).trim(),
    shortLabel: String(label).trim(),
    description: description.trim() || "Custom skill box.",
    categories: category ? [String(category).trim().toLowerCase()] : [],
    names: [],
    custom: true,
    createdAt: new Date().toISOString(),
  };
  saveCustomFolders([...folders, folder]);
  return folder;
}

export function saveCustomFolders(folders) {
  localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(folders));
  notifyTaxonomyChanged();
}

export function deleteCustomFolder(folderId) {
  const remaining = loadCustomFolders().filter((f) => f.id !== folderId);
  const memberships = loadMemberships();
  let changed = false;
  for (const name of Object.keys(memberships)) {
    if (memberships[name] === folderId) {
      delete memberships[name];
      changed = true;
    }
  }
  localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(remaining));
  localStorage.setItem(FOLDER_MEMBERSHIP_KEY, JSON.stringify(memberships));
  notifyTaxonomyChanged();
}

// Attach or change a custom box's category rule after creation (context menu).
export function setCustomFolderRule(folderId, category) {
  const folders = loadCustomFolders();
  const idx = folders.findIndex((f) => f.id === folderId);
  if (idx === -1) return;
  const cat = String(category || "").trim().toLowerCase();
  folders[idx] = {
    ...folders[idx],
    categories: cat ? [cat] : [],
    description: cat
      ? `Custom box — auto-files the "${cat}" category.`
      : "Custom skill box.",
  };
  saveCustomFolders(folders);
}

// Separator-insensitive containment, so a box named "Fantasy Football"
// still matches the category "fantasy-football" (space ↔ hyphen).
function normalizeForMatch(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchSuggestionForLabel(label, suggestions) {
  const needle = normalizeForMatch(label);
  if (needle.length < 3) return null;
  return (
    suggestions.find((s) => {
      const cat = normalizeForMatch(s.category);
      return cat.includes(needle) || needle.includes(cat);
    }) || null
  );
}

// Pin one skill (by name, stable across syncs) into a custom box.
export function fileSkillInto(skillName, folderId) {
  const memberships = loadMemberships();
  const name = String(skillName || "").trim().toLowerCase();
  if (!name) return;
  if (folderId) memberships[name] = folderId;
  else delete memberships[name];
  localStorage.setItem(FOLDER_MEMBERSHIP_KEY, JSON.stringify(memberships));
  notifyTaxonomyChanged();
}

// Categories worth suggesting as new boxes: not explicitly homed in any
// built-in folder's category list, not already covered by a custom box, and
// whose skills only landed where they are by keyword accident (or the fallback).
export function suggestCustomFolders(skills, { minCount = 1, limit = 8 } = {}) {
  const covered = new Set(loadCustomFolders().flatMap((f) => f.categories || []));
  const defaultCats = new Set(displayFolders.flatMap((f) => (f.categories || []).map(lc)));
  const counts = new Map();
  for (const skill of skills || []) {
    const category = lc(skill.category || "");
    if (!category || defaultCats.has(category) || covered.has(category)) continue;
    const primary = getMatchingFolders(skill)[0];
    if (primary && (primary.categories || []).some((c) => lc(c) === category)) continue;
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, count]) => ({ category, count }));
}

function getAllFolders() {
  return [...loadCustomFolders(), ...displayFolders];
}

export function getFolderDefinition(folderId) {
  if (!folderId) return null;
  const custom = loadCustomFolders().find((folder) => folder.id === folderId);
  return custom || folderById.get(folderId) || null;
}

export function displayFolderLabel(folderId) {
  return getFolderDefinition(folderId)?.label || "All Skills";
}

// A skill lives in exactly one folder — its highest-scoring match (fallback otherwise).
export function matchesFolder(skill, folderId) {
  if (!folderId) return true;
  return getPrimaryFolderId(skill) === folderId;
}

export function getMatchingFolders(skill, { includeFallback = true } = {}) {
  // 1. An explicit membership pin ("File into") always wins.
  const name = lc(skill.name);
  const memberships = loadMemberships();
  const customs = loadCustomFolders();
  const pinnedId = memberships[name];
  const pinned = pinnedId ? customs.find((f) => f.id === pinnedId) : null;
  if (pinned) return [pinned];

  // 2. Custom box rules beat the built-in taxonomy — the user created the box
  //    precisely to claim these skills.
  const customMatches = customs
    .filter((folder) => matchesDefinition(skill, folder))
    .sort((a, b) => definitionPriority(skill, b) - definitionPriority(skill, a));
  if (customMatches.length) return customMatches;

  // 3. Built-in folders, then the fallback.
  const direct = displayFolders
    .filter((folder) => !folder.fallback && matchesDefinition(skill, folder))
    .sort((a, b) => definitionPriority(skill, b) - definitionPriority(skill, a));
  if (direct.length || !includeFallback) return direct;
  const fallback = displayFolders.find((folder) => folder.fallback);
  return fallback ? [fallback] : [];
}

export function getPrimaryFolderId(skill) {
  return getMatchingFolders(skill)[0]?.id || "personal-utilities";
}

export function getSkillFolderLabels(skill) {
  return getMatchingFolders(skill).map((folder) => folder.label);
}

// Within its folder a skill lands in exactly one subfolder — the highest-scoring match.
export function getPrimarySubfolderId(skill, folderId) {
  const folder = getFolderDefinition(folderId);
  if (!folder?.subfolders?.length) return null;

  let bestId = null;
  let bestScore = -1;
  for (const subfolder of folder.subfolders) {
    if (!matchesDefinition(skill, subfolder)) continue;
    const score = definitionPriority(skill, subfolder);
    if (score > bestScore) {
      bestScore = score;
      bestId = subfolder.id;
    }
  }
  return bestId;
}

export function matchesSubfolder(skill, folderId, subfolderId) {
  if (!subfolderId) return true;
  return getPrimarySubfolderId(skill, folderId) === subfolderId;
}

export function getFirstMatchingSubfolderId(skill, folderId) {
  return getPrimarySubfolderId(skill, folderId);
}

export function countByDisplayFolder(skills, { search = "", hideEmpty = false } = {}) {
  const query = search.trim().toLowerCase();
  const searched = query ? skills.filter((skill) => skillSearchMatches(skill, query)) : skills;

  const rows = getAllFolders().map((folder) => ({
    ...folder,
    count: searched.filter((skill) => matchesFolder(skill, folder.id)).length,
  }));

  return hideEmpty ? rows.filter((row) => row.count > 0) : rows;
}

export function countBySubfolder(skills, folderId) {
  const folder = getFolderDefinition(folderId);
  if (!folder?.subfolders?.length) return [];

  return folder.subfolders
    .map((subfolder) => ({
      ...subfolder,
      count: skills.filter((skill) => matchesSubfolder(skill, folderId, subfolder.id)).length,
    }))
    .filter((subfolder) => subfolder.count > 0);
}

export function skillSearchMatches(skill, query) {
  if (!query) return true;
  const haystack = [
    searchBlob(skill),
    ...getSkillFolderLabels(skill).map((label) => label.toLowerCase()),
  ].join(" ");
  return haystack.includes(query);
}

export function filterDisplaySkills(
  skills,
  { search = "", folderId = null, subfolderId = null, profile = null } = {},
) {
  const query = search.trim().toLowerCase();

  return skills.filter((skill) => {
    if (profile && skill.profile !== profile) return false;
    if (folderId && !matchesFolder(skill, folderId)) return false;
    // A subfolder filter only applies within a folder. Without a folder
    // ("All Skills"), ignore any lingering subfolder so the list isn't empty.
    if (folderId && subfolderId && !matchesSubfolder(skill, folderId, subfolderId)) return false;
    return skillSearchMatches(skill, query);
  });
}

// ── Related skills ──
// Score siblings against the selected skill: same subfolder is the strongest
// signal, then same display folder, same raw category, and shared meaningful
// words between names/descriptions. Same-name rows from other profiles are
// skipped (they're the same skill).
const RELATED_STOP_WORDS = new Set([
  "with", "this", "that", "from", "into", "your", "you", "the", "and", "for",
  "are", "not", "but", "all", "can", "use", "using", "skill", "skills",
  "agent", "hermes", "create", "manage", "when", "what", "how", "workflows",
  "workflow", "tools", "tool", "data", "files", "file",
]);

function relatedWordSet(...texts) {
  const words = new Set();
  for (const text of texts) {
    for (const w of String(text || "").toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length > 3 && !RELATED_STOP_WORDS.has(w)) words.add(w);
    }
  }
  return words;
}

export function relatedSkills(skill, pool = [], limit = 8) {
  if (!skill || !pool.length) return [];
  const folderId = getPrimaryFolderId(skill);
  const subfolderId = getPrimarySubfolderId(skill, folderId);
  const myWords = relatedWordSet(skill.name, skill.description);
  const myName = (skill.name || "").trim().toLowerCase();

  const scored = [];
  for (const other of pool) {
    if (other.id === skill.id) continue;
    if ((other.name || "").trim().toLowerCase() === myName) continue;

    let score = 0;
    const otherFolder = getPrimaryFolderId(other);
    if (otherFolder === folderId) score += 2;
    if (subfolderId && otherFolder === folderId && getPrimarySubfolderId(other, otherFolder) === subfolderId) score += 5;
    if (other.category && other.category === skill.category) score += 2;

    const otherWords = relatedWordSet(other.name, other.description);
    let overlap = 0;
    for (const w of otherWords) if (myWords.has(w)) overlap += 1;
    score += Math.min(overlap, 5);

    if (score >= 3) scored.push({ skill: other, score });
  }

  scored.sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));

  const seen = new Set();
  const results = [];
  for (const entry of scored) {
    const key = (entry.skill.name || "").trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(entry.skill);
    if (results.length >= limit) break;
  }
  return results;
}
