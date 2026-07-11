import { useEffect, useRef, useState } from "react";
import { Search, X, Regex as RegexIcon, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import type { RawMessage } from "@/types";
import { Avatar } from "@/components/Avatar";
import { formatFullDate } from "@/lib/date";

export interface SearchResult {
  messageId: number;
  sender: string;
  ts: number;
  before: string;
  match: string;
  after: string;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSnippet(text: string, index: number, len: number) {
  const before = text.slice(0, index);
  const match = text.slice(index, index + len);
  const after = text.slice(index + len);
  const beforeWords = before.trim().split(/\s+/).filter(Boolean);
  const afterWords = after.trim().split(/\s+/).filter(Boolean);
  const beforeSlice = beforeWords.slice(-6).join(" ");
  const afterSlice = afterWords.slice(0, 6).join(" ");
  return {
    before: (beforeWords.length > 6 ? "… " : "") + beforeSlice,
    match,
    after: afterSlice + (afterWords.length > 6 ? " …" : ""),
  };
}

export function SearchPanel({
  messages,
  onJump,
  onClose,
}: {
  messages: RawMessage[];
  onJump: (messageId: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [resultsOpen, setResultsOpen] = useState(true);
  const tokenRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    const myToken = ++tokenRef.current;
    setLoading(true);
    setError(null);

    let re: RegExp;
    try {
      re = new RegExp(useRegex ? q : escapeRegex(q), "gi");
    } catch {
      setError("Invalid regular expression");
      setLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      const found: SearchResult[] = [];
      const CHUNK = 2000;
      for (let i = 0; i < messages.length; i++) {
        if (tokenRef.current !== myToken) return; // stale
        const m = messages[i];
        if (m.system || m.deleted || m.isMedia || !m.text) continue;
        re.lastIndex = 0;
        let match: RegExpExecArray | null;
        let guard = 0;
        while ((match = re.exec(m.text)) && guard < 20) {
          guard++;
          const snippet = buildSnippet(m.text, match.index, match[0].length || 1);
          found.push({
            messageId: m.id,
            sender: m.sender ?? "Unknown",
            ts: m.ts,
            ...snippet,
          });
          if (match[0].length === 0) re.lastIndex++;
          if (found.length >= 500) break;
        }
        if (found.length >= 500) break;
        if (i % CHUNK === 0 && i > 0) await new Promise((r) => setTimeout(r, 0));
      }
      if (tokenRef.current === myToken) {
        setResults(found);
        setActiveIndex(found.length ? 0 : -1);
        setLoading(false);
        setResultsOpen(true);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, useRegex, messages]);

  const goTo = (idx: number, collapse = true) => {
    if (results.length === 0) return;
    const next = ((idx % results.length) + results.length) % results.length;
    setActiveIndex(next);
    onJump(results[next].messageId);
    if (collapse) setResultsOpen(false);
  };

  return (
    <div className="absolute inset-x-0 top-0 z-30 flex max-h-full flex-col overflow-hidden rounded-b-2xl bg-white shadow-lg">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2.5">
        <button onClick={onClose} className="p-1 text-neutral-500 hover:text-neutral-800">
          <X size={20} />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5">
          <Search size={16} className="text-neutral-400" />
          <input
            autoFocus
            value={query}
            onFocus={() => results.length > 0 && setResultsOpen(true)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                goTo(e.shiftKey ? activeIndex - 1 : activeIndex + 1);
              }
            }}
            placeholder="Search in conversation"
            className="w-full bg-transparent text-sm outline-none"
          />
          {loading && <Loader2 size={14} className="animate-spin text-neutral-400" />}
        </div>
        <button
          onClick={() => setUseRegex((r) => !r)}
          title="Toggle regex search"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            useRegex ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          <RegexIcon size={15} />
        </button>
      </div>

      {results.length > 0 && (
        <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-1.5">
          <button
            onClick={() => setResultsOpen((o) => !o)}
            className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800"
          >
            {activeIndex + 1} of {results.length} occurrence{results.length === 1 ? "" : "s"}{" "}
            {resultsOpen ? "▲" : "▼"}
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goTo(activeIndex - 1)}
              className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100"
              title="Previous occurrence"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100"
              title="Next occurrence"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      )}

      {resultsOpen && (
        <div className="flex-1 overflow-y-auto">
          {error && <div className="p-4 text-sm text-red-500">{error}</div>}
          {!error && query.trim() && !loading && results.length === 0 && (
            <div className="p-6 text-center text-sm text-neutral-400">No results</div>
          )}
          {!query.trim() && (
            <div className="p-6 text-center text-sm text-neutral-400">
              Search across the whole conversation, plain text or regex.
            </div>
          )}
          <ul>
            {results.map((r, i) => (
              <li key={`${r.messageId}-${i}`}>
                <button
                  onClick={() => goTo(i)}
                  className={`flex w-full items-start gap-2.5 border-b border-neutral-50 px-3 py-2.5 text-left hover:bg-neutral-50 ${
                    i === activeIndex ? "bg-neutral-50" : ""
                  }`}
                >
                  <Avatar name={r.sender} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-neutral-800">{r.sender}</span>
                      <span className="shrink-0 text-[11px] text-neutral-400">{formatFullDate(r.ts)}</span>
                    </div>
                    <p className="truncate text-[13px] text-neutral-500">
                      {r.before} <span className="bg-yellow-200 font-medium text-neutral-900">{r.match}</span>{" "}
                      {r.after}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {results.length >= 500 && (
            <div className="p-3 text-center text-xs text-neutral-400">Showing first 500 matches</div>
          )}
        </div>
      )}
    </div>
  );
}
