import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Power, TerminalSquare } from "lucide-react";
import { applyCompletion, createCommands, findCommand, getCompletions } from "../lib/terminalCommands";
import {
  AGENT_MODELS_FALLBACK,
  DEFAULT_AGENT_MODEL,
  fetchAgentModels,
  streamAgentChat,
} from "../lib/api";

const BANNER = [
  { type: "system", text: "HERMES TERMINAL v2.0 — now with AI" },
  { type: "system", text: "type a question in plain English, or 'help' for commands" },
  { type: "system", text: "'model' switches the AI · 'exit' powers off" },
];

const PHASE_CLASS = {
  on: "is-powering-on",
  ready: "is-on",
  off: "is-powering-off",
};

export default function TerminalMode({
  folders = [],
  skills = [],
  onOpenFolder,
  onBack,
  onHome,
  onProfiles,
  onExit,
  onRefreshDashboard,
  lastFocusRef,
}) {
  const [log, setLog] = useState(BANNER);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [phase, setPhase] = useState("on");

  // AI agent state
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentModels, setAgentModels] = useState(AGENT_MODELS_FALLBACK);
  const [agentModel, setAgentModel] = useState(() => {
    try {
      return localStorage.getItem("agent-model") || DEFAULT_AGENT_MODEL;
    } catch {
      return DEFAULT_AGENT_MODEL;
    }
  });

  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const histIdxRef = useRef(0);
  const afterOffRef = useRef(null);
  const phaseRef = useRef("on");
  const modelRef = useRef(agentModel);
  const agentMessagesRef = useRef([]); // conversation: [{ role, content }]
  const streamingRef = useRef(false); // an assistant text line is currently growing

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    modelRef.current = agentModel;
  }, [agentModel]);

  const setModel = useCallback((id) => {
    setAgentModel(id);
    try {
      localStorage.setItem("agent-model", id);
    } catch {
      /* ignore */
    }
  }, []);
  const getModel = useCallback(() => modelRef.current, []);

  const switchModel = useCallback(
    (id) => {
      if (!id || id === modelRef.current) return;
      setModel(id);
      setLog((l) => [...l, { type: "system", text: `ai model → ${id}` }]);
    },
    [setModel],
  );

  // Pull the model registry from the backend (falls back to the static list).
  // A stored model that's gone from the registry (or whose provider lost its
  // API key) is migrated to the backend default.
  useEffect(() => {
    let active = true;
    fetchAgentModels()
      .then((data) => {
        if (!active) return;
        if (!Array.isArray(data?.models) || !data.models.length) return;
        setAgentModels(data.models);
        const usable = data.models.filter((m) => m.available !== false);
        if (usable.some((m) => m.id === modelRef.current)) return;
        const next = usable.some((m) => m.id === data.default) ? data.default : usable[0]?.id;
        if (next) setModel(next);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [setModel]);

  // Power off (with an optional follow-up action), letting the CRT animation play
  // out before the parent unmounts/navigates. Guarded so it only fires once.
  const beginPowerOff = useCallback((after) => {
    if (phaseRef.current === "off") return;
    afterOffRef.current = typeof after === "function" ? after : null;
    setPhase("off");
  }, []);

  const handleFrameAnimEnd = useCallback(
    (event) => {
      if (event.target !== event.currentTarget) return; // ignore child animations
      if (phaseRef.current === "on") {
        setPhase("ready");
      } else if (phaseRef.current === "off") {
        const after = afterOffRef.current;
        afterOffRef.current = null;
        onExit();
        if (after) after();
      }
    },
    [onExit],
  );

  // Command context: read commands print inline; action commands power the
  // terminal off and then drive the real dashboard via the parent callbacks.
  const ctx = useMemo(
    () => ({
      folders,
      skills,
      models: agentModels,
      getModel,
      setModel,
      clear: () => setLog([]),
      onOpenFolder: (id) => beginPowerOff(() => onOpenFolder?.(id)),
      onBack: () => beginPowerOff(() => onBack?.()),
      onHome: () => beginPowerOff(() => onHome?.()),
      onProfiles: () => beginPowerOff(() => onProfiles?.()),
      onExit: () => beginPowerOff(),
    }),
    [folders, skills, agentModels, getModel, setModel, beginPowerOff, onOpenFolder, onBack, onHome, onProfiles],
  );
  const commands = useMemo(() => createCommands(ctx), [ctx]);

  const appendResult = useCallback((result) => {
    if (!result) return;
    if (Array.isArray(result)) {
      setLog((l) => [...l, ...result.map((text) => ({ type: "output", text }))]);
    } else if (result.lines) {
      setLog((l) => [...l, ...result.lines.map((text) => ({ type: result.type || "output", text }))]);
    }
  }, []);

  // ── Streaming log helpers ──
  // Append a streamed text delta to the active assistant line (creating it on the
  // first delta). Tool lines close the current line so the next text starts fresh
  // below them, preserving event order.
  const appendToStream = useCallback((delta) => {
    setLog((l) => {
      const copy = [...l];
      let idx = -1;
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].streaming) {
          idx = i;
          break;
        }
      }
      if (idx === -1) copy.push({ type: "output", text: delta, streaming: true });
      else copy[idx] = { ...copy[idx], text: copy[idx].text + delta };
      return copy;
    });
    streamingRef.current = true;
  }, []);

  const pushToolLine = useCallback((tool) => {
    streamingRef.current = false;
    setLog((l) => [
      ...l.map((e) => (e.streaming ? { ...e, streaming: false } : e)),
      { type: "system", text: `· ${tool.summary || tool.name}` },
    ]);
  }, []);

  const closeStream = useCallback(() => {
    streamingRef.current = false;
    setLog((l) => l.map((e) => (e.streaming ? { ...e, streaming: false } : e)));
  }, []);

  const askAgent = useCallback(
    async (text) => {
      setAgentBusy(true);
      const outgoing = [...agentMessagesRef.current, { role: "user", content: text }];
      agentMessagesRef.current = outgoing;
      let assistant = "";
      let refresh = false;
      await streamAgentChat(
        { messages: outgoing, model: modelRef.current },
        {
          onText: (t) => {
            assistant += t;
            appendToStream(t);
          },
          onTool: (tool) => pushToolLine(tool),
          onError: (m) => setLog((l) => [...l, { type: "error", text: `agent: ${m}` }]),
          onDone: (d) => {
            refresh = !!(d && d.refresh);
          },
        },
      );
      closeStream();
      // Keep the assistant turn only if it produced text, so a failed turn doesn't
      // poison the next request with an empty assistant message.
      agentMessagesRef.current = assistant.trim()
        ? [...outgoing, { role: "assistant", content: assistant }]
        : outgoing;
      setAgentBusy(false);
      if (refresh) onRefreshDashboard?.();
    },
    [appendToStream, pushToolLine, closeStream, onRefreshDashboard],
  );

  const runLine = useCallback(
    async (raw) => {
      setLog((l) => [...l, { type: "input", text: raw }]);
      const line = raw.trim();
      if (!line) return;
      setHistory((h) => {
        const next = [...h, raw];
        histIdxRef.current = next.length;
        return next;
      });
      const [name, ...args] = line.split(/\s+/);
      const command = findCommand(commands, name);
      if (command) {
        appendResult(command.run(args));
        return;
      }
      // Unknown command → treat as natural language for the AI agent.
      if (agentBusy) {
        setLog((l) => [...l, { type: "error", text: "agent is busy — wait for the current reply" }]);
        return;
      }
      await askAgent(line);
    },
    [commands, appendResult, askAgent, agentBusy],
  );

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      if (phase === "off" || agentBusy) return;
      const value = input;
      setInput("");
      runLine(value);
    },
    [input, runLine, agentBusy, phase],
  );

  const complete = useCallback(() => {
    const { token, isFirst, matches, lcp } = getCompletions(input, commands, folders, skills);
    if (!matches.length) return;
    if (matches.length === 1) {
      setInput(applyCompletion(input, matches[0], isFirst) + (isFirst ? " " : ""));
      return;
    }
    if (lcp && lcp.length > token.length) setInput(applyCompletion(input, lcp, isFirst));
    setLog((l) => [...l, { type: "output", text: matches.slice(0, 24).join("   ") }]);
  }, [input, commands, folders, skills]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        beginPowerOff();
      } else if (event.key === "Tab") {
        event.preventDefault();
        complete();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!history.length) return;
        const idx = Math.max(0, histIdxRef.current - 1);
        histIdxRef.current = idx;
        setInput(history[idx] ?? "");
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        const idx = histIdxRef.current + 1;
        if (idx >= history.length) {
          histIdxRef.current = history.length;
          setInput("");
        } else {
          histIdxRef.current = idx;
          setInput(history[idx]);
        }
      }
    },
    [beginPowerOff, complete, history],
  );

  // Autofocus input on open; restore focus to the trigger on close.
  useEffect(() => {
    inputRef.current?.focus();
    const trigger = lastFocusRef?.current;
    return () => trigger?.focus?.();
  }, [lastFocusRef]);

  // Lock background scroll while the terminal is up.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Esc fallback at the window level in case focus leaves the input.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") beginPowerOff();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beginPowerOff]);

  // Keep the newest output in view.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [log]);

  const lineClass = (type) =>
    type === "input"
      ? "text-sky-100"
      : type === "error"
        ? "text-rose-300/90"
        : type === "system"
          ? "text-sky-300/70"
          : "text-emerald-100/80";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4 sm:px-6">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => beginPowerOff()}
        className="absolute inset-0 cursor-default bg-slate-950/35"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Hermes terminal"
        onAnimationEnd={handleFrameAnimEnd}
        className={`terminal-frame relative z-10 flex h-[62vh] max-h-[560px] w-full max-w-2xl flex-col ${PHASE_CLASS[phase]}`}
      >
        <header className="flex items-center justify-between border-b border-sky-300/15 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sky-200/80">
            <TerminalSquare className="h-4 w-4" />
            <span className="text-xs font-semibold tracking-wide">hermes — terminal</span>
          </div>
          <div className="flex items-center gap-3">
            {agentBusy ? (
              <span className="hidden text-[10px] uppercase tracking-wider text-sky-200/45 sm:inline">● thinking…</span>
            ) : (
              <select
                value={agentModel}
                onChange={(e) => switchModel(e.target.value)}
                aria-label="AI model"
                className="hidden cursor-pointer rounded border border-sky-300/20 bg-transparent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-200/70 outline-none transition hover:border-sky-300/45 hover:text-sky-100 sm:inline"
              >
                {agentModels.filter((m) => m.available !== false).map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 font-sans text-xs normal-case tracking-normal text-sky-100">
                    {m.label || m.id}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => beginPowerOff()}
              aria-label="Close terminal"
              className="rounded-md p-1 text-sky-200/60 transition hover:bg-white/10 hover:text-white"
            >
              <Power className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div ref={bodyRef} className="terminal-body scroll-fade flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-6">
          {log.map((entry, i) => (
            <div key={i} className={lineClass(entry.type)}>
              {entry.type === "input" ? <span className="text-sky-400/70">{"> "}</span> : null}
              <span className="whitespace-pre-wrap break-words">{entry.text}</span>
            </div>
          ))}

          <form onSubmit={handleSubmit} className="mt-1 flex items-center gap-2">
            <span className="text-sky-400/80">{">"}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={phase === "off" || agentBusy}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              className="flex-1 border-none bg-transparent text-sky-50 caret-sky-300 outline-none placeholder:text-sky-200/30 disabled:opacity-60"
              placeholder={agentBusy ? "thinking…" : "ask anything, or type a command — try 'help'"}
              aria-label="Terminal command input"
            />
          </form>
        </div>
      </section>
    </div>
  );
}
