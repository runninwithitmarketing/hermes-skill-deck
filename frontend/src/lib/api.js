// In the desktop app the FastAPI backend serves this frontend on port 8765, so
// "same origin" works. In dev (Vite on :5173/5174) the API lives on :8000.
// Detect by checking the port the page itself was loaded from.
const API_BASE =
  window.location.port === "8765" ? "/api" : "http://localhost:8000/api";

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function fetchSkills(params = {}) {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.profile) query.set("profile", params.profile);
  if (params.search) query.set("search", params.search);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson(`/skills${suffix}`);
}

// Full SKILL.md body (frontmatter stripped server-side) for the md viewer.
export function fetchSkillContent(skillId) {
  return requestJson(`/skills/${skillId}/content`);
}

// Reveal the skill's folder (or its references folder) in Finder.
export function openSkillFolder(skillId, which = "skill") {
  return requestJson(`/skills/${skillId}/open?which=${which}`, { method: "POST" });
}

// Open a Terminal.app window with an interactive hermes chat session that
// preloads this skill (`hermes --profile P chat -s <name>`).
export function startSkillSession(skillId) {
  return requestJson(`/skills/${skillId}/session`, { method: "POST" });
}

export function fetchCategories() {
  return requestJson("/categories");
}

export function fetchProfiles() {
  return requestJson("/profiles");
}

export function fetchSummary() {
  return requestJson("/summary");
}

export function syncSkills() {
  return requestJson("/sync", { method: "POST" });
}

export async function fetchDashboardData() {
  const [skills, categories, profiles, summary] = await Promise.all([
    fetchSkills(),
    fetchCategories(),
    fetchProfiles(),
    fetchSummary(),
  ]);

  return { skills, categories, profiles, summary };
}

export function openTarget(target) {
  return requestJson(`/open/${target}`, { method: "POST" });
}

export const DEFAULT_AGENT_MODEL = "glm-5.3-flash";

// Fallback list used until the backend's /agent/models registry loads.
export const AGENT_MODELS_FALLBACK = [
  { id: "glm-5.3-flash", label: "GLM 5.3 Flash" },
  { id: "glm-5.3", label: "GLM 5.3" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
];

export function fetchAgentModels() {
  return requestJson("/agent/models");
}

function parseSSEChunk(chunk) {
  let event = "message";
  const dataLines = [];
  for (const line of chunk.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
  }
  if (!dataLines.length) return null;
  const raw = dataLines.join("\n");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }
  return { event, data };
}

// Stream a terminal-agent turn, invoking handlers as Server-Sent Events arrive.
// `messages` is [{ role, content }]; `model` is a model id from the registry.
export async function streamAgentChat({ messages, model }, handlers = {}) {
  const { onText, onTool, onError, onDone } = handlers;
  let response;
  try {
    response = await fetch(`${API_BASE}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, model }),
    });
  } catch (err) {
    onError?.(err?.message || "network error");
    return;
  }
  if (!response.ok || !response.body) {
    onError?.(`${response.status} ${response.statusText}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const parsed = parseSSEChunk(chunk);
        if (!parsed) continue;
        if (parsed.event === "text") {
          onText?.(typeof parsed.data === "string" ? parsed.data : parsed.data.text || "");
        } else if (parsed.event === "tool") {
          onTool?.(parsed.data);
        } else if (parsed.event === "error") {
          onError?.(parsed.data?.message || String(parsed.data));
        } else if (parsed.event === "done") {
          onDone?.(parsed.data || {});
        }
      }
    }
  } catch (err) {
    onError?.(err?.message || "stream interrupted");
  }
}
