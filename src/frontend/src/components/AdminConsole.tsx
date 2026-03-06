import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useAppState } from "@/store/useAppStore";
import type { ConsoleLogEntry } from "@/store/useAppStore";
import { useEffect, useRef, useState } from "react";

const APP_VERSION = "1.0.0";

function getTimestamp(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function levelColor(level: ConsoleLogEntry["level"]): string {
  switch (level) {
    case "INFO":
      return "#22c55e"; // green
    case "WARN":
      return "#eab308"; // yellow
    case "ERROR":
      return "#ef4444"; // red
    case "ADMIN":
      return "#06b6d4"; // cyan
    case "CMD":
      return "#f8fafc"; // white
    default:
      return "#94a3b8";
  }
}

export default function AdminConsole() {
  const { state, dispatch } = useAppState();
  const { identity } = useInternetIdentity();
  const [input, setInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const principal = identity?.getPrincipal().toString() ?? "anonymous";

  const logsLength = state.consoleLogs.length;

  // Auto-scroll on new logs
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally using length
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logsLength]);

  // Welcome banner on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run once on mount
  useEffect(() => {
    const hasWelcome = state.consoleLogs.some(
      (l) =>
        l.message ===
        "TuneSearch Admin Console v1.0 — Type 'help' for commands",
    );
    if (!hasWelcome) {
      addLog(
        "ADMIN",
        "TuneSearch Admin Console v1.0 — Type 'help' for commands",
      );
      addLog("INFO", `Logged in as: ${state.userEmail || principal}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addLog(
    level: ConsoleLogEntry["level"],
    message: string,
    output?: string,
  ) {
    const entry: ConsoleLogEntry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      level,
      message,
      output,
    };
    dispatch({ type: "ADD_CONSOLE_LOG", entry });
  }

  function executeCommand(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Add to history
    setCmdHistory((prev) => [trimmed, ...prev.slice(0, 49)]);
    setHistoryIdx(-1);

    // Log the command
    addLog("CMD", `> ${trimmed}`);

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case "help":
        addLog(
          "INFO",
          [
            "Available commands:",
            "  help                   — List all commands",
            "  clear                  — Clear console output",
            "  status                 — Show app status",
            "  whoami                 — Show current user info",
            "  list-admins            — List all admin emails",
            "  grant-admin <email>    — Grant admin to email",
            "  revoke-admin <email>   — Revoke admin from email",
            "  set-config <key> <val> — Set app config value",
            "  get-config             — Print full app config",
            "  log <message>          — Add custom INFO log",
            "  export-logs            — Download logs as .txt",
            "  set-api-key <key>      — Update YouTube API key",
            "  reset-config           — Reset app config to defaults",
          ].join("\n"),
        );
        break;

      case "clear":
        dispatch({ type: "CLEAR_CONSOLE_LOGS" });
        break;

      case "status":
        addLog(
          "INFO",
          [
            `TuneSearch v${APP_VERSION}`,
            `API key: ${state.apiKey ? `set (${state.apiKey.slice(0, 8)}…)` : "not set"}`,
            `Admin emails: ${state.adminEmails.join(", ")}`,
            `Current user: ${state.userEmail || principal}`,
            `Is admin: ${state.isAdmin}`,
          ].join("\n"),
        );
        break;

      case "whoami":
        addLog(
          "INFO",
          [
            `Principal: ${principal}`,
            `Email: ${state.userEmail || "(not set)"}`,
            `Admin: ${state.isAdmin}`,
          ].join("\n"),
        );
        break;

      case "list-admins":
        addLog(
          "INFO",
          `Admin emails:\n${state.adminEmails.map((e) => `  • ${e}`).join("\n")}`,
        );
        break;

      case "grant-admin": {
        const email = args[0];
        if (!email) {
          addLog("ERROR", "Usage: grant-admin <email>");
          break;
        }
        if (state.adminEmails.includes(email)) {
          addLog("WARN", `${email} is already an admin`);
          break;
        }
        dispatch({ type: "GRANT_ADMIN", email });
        addLog("ADMIN", `Admin granted to: ${email}`);
        break;
      }

      case "revoke-admin": {
        const email = args[0];
        if (!email) {
          addLog("ERROR", "Usage: revoke-admin <email>");
          break;
        }
        if (email === "Prajwol9847@gmail.com") {
          addLog("ERROR", "Cannot revoke super admin (Prajwol9847@gmail.com)");
          break;
        }
        dispatch({ type: "REVOKE_ADMIN", email });
        addLog("ADMIN", `Admin revoked from: ${email}`);
        break;
      }

      case "set-config": {
        const key = args[0] as keyof typeof state.appCustomConfig | undefined;
        const value = args.slice(1).join(" ");
        if (!key || !value) {
          addLog(
            "ERROR",
            "Usage: set-config <key> <value>\nKeys: appName, tagline, logoUrl, bannerUrl, creditsHtml",
          );
          break;
        }
        const validKeys = [
          "appName",
          "tagline",
          "logoUrl",
          "bannerUrl",
          "creditsHtml",
        ];
        if (!validKeys.includes(key)) {
          addLog(
            "ERROR",
            `Invalid key: ${key}\nValid keys: ${validKeys.join(", ")}`,
          );
          break;
        }
        dispatch({ type: "SET_APP_CONFIG", config: { [key]: value } });
        addLog("ADMIN", `Config updated: ${key} = "${value}"`);
        break;
      }

      case "get-config":
        addLog("INFO", JSON.stringify(state.appCustomConfig, null, 2));
        break;

      case "log": {
        const msg = args.join(" ");
        if (!msg) {
          addLog("ERROR", "Usage: log <message>");
          break;
        }
        addLog("INFO", msg);
        break;
      }

      case "export-logs": {
        const lines = [...state.consoleLogs]
          .reverse()
          .map(
            (l) =>
              `[${getTimestamp(l.timestamp)}] [${l.level}] ${l.message}${l.output ? `\n  ${l.output}` : ""}`,
          )
          .join("\n");
        const blob = new Blob([lines], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tunesearch-logs-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addLog("INFO", "Logs exported successfully");
        break;
      }

      case "set-api-key": {
        const key = args[0];
        if (!key) {
          addLog("ERROR", "Usage: set-api-key <key>");
          break;
        }
        dispatch({ type: "SET_API_KEY", key });
        addLog("ADMIN", `API key updated: ${key.slice(0, 8)}…`);
        break;
      }

      case "reset-config": {
        const defaults = {
          appName: "TuneSearch",
          tagline: "Search and play music from YouTube",
          logoUrl: "/assets/uploads/tunesearch-logo-user.jpg",
          bannerUrl: "",
          creditsHtml: "Developed by DemonXEnma in Sponser with Caffeine",
        };
        dispatch({ type: "SET_APP_CONFIG", config: defaults });
        addLog("ADMIN", "App config reset to defaults");
        break;
      }

      default:
        addLog(
          "ERROR",
          `Unknown command: ${cmd}. Type 'help' for available commands.`,
        );
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(nextIdx);
      setInput(cmdHistory[nextIdx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(nextIdx);
      setInput(nextIdx === -1 ? "" : (cmdHistory[nextIdx] ?? ""));
    }
  };

  // Reversed for display (newest at bottom)
  const displayLogs = [...state.consoleLogs].reverse();

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Terminal div focus on click is intentional
    <div
      className="flex flex-col h-full rounded-lg overflow-hidden border border-[#1e2a1e]"
      style={{ background: "#0d0d0d" }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Log output area */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 min-h-0">
        {displayLogs.length === 0 && (
          <p style={{ color: "#4a5568" }}>Console output will appear here…</p>
        )}
        {displayLogs.map((entry) => (
          <div key={entry.id} className="leading-relaxed">
            <span style={{ color: "#4a5568" }}>
              [{getTimestamp(entry.timestamp)}]
            </span>{" "}
            <span
              style={{
                color: levelColor(entry.level),
                fontWeight: entry.level === "CMD" ? 600 : 400,
              }}
            >
              [{entry.level}]
            </span>{" "}
            <span
              style={{
                color: entry.level === "CMD" ? "#e2e8f0" : "#cbd5e1",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {entry.message}
            </span>
            {entry.output && (
              <div
                style={{
                  color: "#64748b",
                  paddingLeft: "1.5rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: "0.8em",
                }}
              >
                {entry.output}
              </div>
            )}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-t"
        style={{ borderColor: "#1e2a1e", background: "#0a0a0a" }}
      >
        <span
          style={{ color: "#22c55e" }}
          className="font-mono text-sm font-bold select-none"
        >
          &gt;
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command… (try 'help')"
          className="flex-1 bg-transparent outline-none font-mono text-sm"
          style={{ color: "#e2e8f0", caretColor: "#22c55e" }}
          spellCheck={false}
          autoComplete="off"
          data-ocid="console.input"
        />
      </div>
    </div>
  );
}
