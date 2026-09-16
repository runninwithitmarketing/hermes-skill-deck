import { filterDisplaySkills } from "./displayTaxonomy";
import { titleize } from "./format";

const ARG_FOLDER_COMMANDS = ["open", "ls", "search"];

function folderName(folder) {
  return folder.overrideLabel || folder.label || folder.id;
}

// Case-insensitive resolution of a typed name against a folder's id / label /
// shortLabel. Prefers an exact match, then a prefix match, then a substring.
export function resolveFolder(name, folders = []) {
  const needle = String(name || "").trim().toLowerCase();
  if (!needle) return null;
  const fields = (f) => [f.id, f.label, f.shortLabel, f.overrideLabel].filter(Boolean).map((v) => String(v).toLowerCase());
  return (
    folders.find((f) => fields(f).some((v) => v === needle)) ||
    folders.find((f) => fields(f).some((v) => v.startsWith(needle))) ||
    folders.find((f) => fields(f).some((v) => v.includes(needle))) ||
    null
  );
}

export function findCommand(commands, name) {
  const key = String(name || "").toLowerCase();
  return commands.find((c) => c.name === key || (c.aliases || []).includes(key)) || null;
}

// Build the command registry. `ctx` carries data + callbacks supplied by
// TerminalMode: { folders, skills, clear, onOpenFolder, onBack, onHome,
// onProfiles, onExit }. Read commands return printable lines (an array, or
// { type, lines }); action commands invoke a ctx callback and return nothing.
export function createCommands(ctx) {
  const commands = [
    {
      name: "help",
      aliases: ["?", "man"],
      kind: "read",
      description: "List available commands",
      run() {
        const rows = commands.map((c) => {
          const names = [c.name, ...(c.aliases || [])].join(", ");
          return `  ${names.padEnd(20)} ${c.description}`;
        });
        return [
          "HERMES TERMINAL — commands:",
          ...rows,
          "",
          "Or just type a question in plain English to ask the AI.",
          "Tab completes · ↑/↓ history · Esc exits",
        ];
      },
    },
    {
      name: "ls",
      aliases: ["list", "dir"],
      kind: "read",
      description: "List folders, or skills in one: ls <folder>",
      run(args) {
        const folders = ctx.folders || [];
        if (args.length) {
          const folder = resolveFolder(args.join(" "), folders);
          if (!folder) return { type: "error", lines: [`ls: no folder matching "${args.join(" ")}"`] };
          const skills = filterDisplaySkills(ctx.skills || [], { folderId: folder.id });
          if (!skills.length) return [`${folderName(folder)} is empty.`];
          return [
            `${folderName(folder)} — ${skills.length} skill${skills.length === 1 ? "" : "s"}:`,
            ...skills.map((s) => `  ${titleize(s.name)}`),
          ];
        }
        if (!folders.length) return ["No folders loaded."];
        return [
          `${folders.length} folder${folders.length === 1 ? "" : "s"}:`,
          ...folders.map((f) => `  ${String(f.id).padEnd(16)} ${folderName(f).padEnd(20)} (${f.count})`),
        ];
      },
    },
    {
      name: "search",
      aliases: ["find", "grep"],
      kind: "read",
      description: "Search skills: search <query>",
      run(args) {
        const query = args.join(" ").trim();
        if (!query) return { type: "error", lines: ["search: usage — search <query>"] };
        const skills = filterDisplaySkills(ctx.skills || [], { search: query });
        if (!skills.length) return [`No skills match "${query}".`];
        const shown = skills.slice(0, 12);
        const lines = shown.map((s) => `  ${titleize(s.name)}  ·  ${s.profile || "default"}`);
        if (skills.length > shown.length) lines.push(`  …and ${skills.length - shown.length} more`);
        return [`${skills.length} match${skills.length === 1 ? "" : "es"} for "${query}":`, ...lines];
      },
    },
    {
      name: "clear",
      aliases: ["cls"],
      kind: "read",
      description: "Clear the screen",
      run() {
        ctx.clear();
        return null;
      },
    },
    {
      name: "model",
      aliases: ["models", "ai"],
      kind: "read",
      description: "Show or switch the AI model: model <id>",
      run(args) {
        const models = ctx.models || [];
        const current = ctx.getModel?.();
        if (!args.length) {
          return [
            `AI model: ${current}`,
            "available:",
            ...models.map(
              (m) => `  ${String(m.id).padEnd(20)} ${m.label || ""}${m.id === current ? "  ←" : ""}`,
            ),
            "switch with: model <id>",
          ];
        }
        const wanted = args.join(" ").trim();
        const match =
          models.find((m) => String(m.id).toLowerCase() === wanted.toLowerCase()) ||
          models.find((m) => String(m.id).toLowerCase().includes(wanted.toLowerCase()));
        const id = match ? match.id : wanted;
        ctx.setModel?.(id);
        return [`AI model set to ${id}`];
      },
    },
    {
      name: "open",
      aliases: ["cd", "go"],
      kind: "action",
      description: "Open a folder: open <folder>",
      run(args) {
        const target = args.join(" ").trim();
        if (target === "..") return void ctx.onBack();
        if (target === "~" || target === "/") return void ctx.onHome();
        if (!target) return { type: "error", lines: ["open: usage — open <folder>"] };
        const folder = resolveFolder(target, ctx.folders || []);
        if (!folder) return { type: "error", lines: [`open: no folder matching "${target}"`] };
        ctx.onOpenFolder(folder.id);
      },
    },
    {
      name: "back",
      aliases: [".."],
      kind: "action",
      description: "Go back one level",
      run() {
        ctx.onBack();
      },
    },
    {
      name: "home",
      aliases: ["~"],
      kind: "action",
      description: "Return to the desktop",
      run() {
        ctx.onHome();
      },
    },
    {
      name: "profiles",
      aliases: ["whoami"],
      kind: "action",
      description: "Open the profiles view",
      run() {
        ctx.onProfiles();
      },
    },
    {
      name: "exit",
      aliases: ["quit", "q"],
      kind: "action",
      description: "Power off the terminal",
      run() {
        ctx.onExit();
      },
    },
  ];
  return commands;
}

function longestCommonPrefix(items) {
  if (!items.length) return "";
  let prefix = items[0];
  for (const item of items) {
    while (prefix && !item.toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.slice(0, -1);
    }
    if (!prefix) return "";
  }
  return prefix;
}

// Compute Tab-completion candidates for the current input. First token completes
// against command names/aliases; an argument after open/cd/ls/search completes
// against folder ids+labels (and skill names for search).
export function getCompletions(input, commands, folders = [], skills = []) {
  const parts = input.split(/\s+/);
  const isFirst = parts.length <= 1;
  const token = (isFirst ? parts[0] : parts[parts.length - 1]) || "";

  let pool = [];
  if (isFirst) {
    pool = commands.flatMap((c) => [c.name, ...(c.aliases || [])]);
  } else {
    const cmd = findCommand(commands, parts[0]);
    if (cmd && ARG_FOLDER_COMMANDS.includes(cmd.name)) {
      const folderTokens = folders.flatMap((f) => [f.id, f.overrideLabel || f.label]);
      const skillTokens = skills.map((s) => s.name);
      pool = cmd.name === "search" ? skillTokens : [...folderTokens, ...skillTokens];
    }
  }

  const lower = token.toLowerCase();
  const matches = [...new Set(pool.filter(Boolean).map(String))].filter((c) => c.toLowerCase().startsWith(lower));
  return { token, isFirst, matches, lcp: longestCommonPrefix(matches) };
}

// Replace the trailing (or only) token of `input` with `completion`.
export function applyCompletion(input, completion, isFirst) {
  if (isFirst) return completion;
  const parts = input.split(/\s+/);
  parts[parts.length - 1] = completion;
  return parts.join(" ");
}
