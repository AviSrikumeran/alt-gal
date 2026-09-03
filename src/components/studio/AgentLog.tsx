'use client';
import { useEffect, useRef, useState } from 'react';
import type { AgentLogEntry } from '@/types/log';
import { useLogStore } from '@/stores/logStore';
import { useWebMCPStatusStore } from '@/stores/webmcpStatusStore';
import { undoEntry } from '@/engine/undo';
import { pushToast } from './toastStore';
import { S } from './strings';

type Filter = 'all' | 'agent' | 'human';

/**
 * D-038: timestamps are stored as Unix ms and formatted only here. §E asks for mission-elapsed
 * time rather than wall clock, so the loop reads `T+00:14:22` — elapsed from the first entry
 * burned to the recorder. `epoch` is derived from the entries themselves, never stored, so this
 * stays a formatting change and the log's shape is untouched (§I flag a).
 */
const pad = (n: number): string => String(Math.floor(n)).padStart(2, '0');

export const missionElapsed = (ms: number, epoch: number): string => {
  const s = Math.max(0, Math.round((ms - epoch) / 1000));
  return `T+${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
};

const truncate = (s: string, n = 40): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function valueSummary(value: unknown): string {
  if (typeof value === 'string') return `"${truncate(value)}"`;
  if (Array.isArray(value)) return `[${value.length}]`;
  if (value && typeof value === 'object') return '{…}';
  return String(value);
}

/** Row 2: `key: value · key: value` (§5.4). */
export function inputSummary(input: Record<string, unknown>): string {
  const parts = Object.entries(input).map(([k, v]) => `${k}: ${valueSummary(v)}`);
  return parts.join(' · ');
}

/** Human entries read as plain language; agent entries keep the tool name (D-160). */
export function entryLabel(entry: AgentLogEntry): string {
  // I-8: a call the human drove from the Tool Inspector went through the same host path as a
  // real agent call, so the transcript says which it was instead of implying a host was there.
  if (entry.actor === 'agent') return entry.source === 'inspector' ? `${entry.tool} · inspector` : entry.tool;
  const subject = String(
    entry.input.path ?? entry.input.role ?? entry.input.type ?? entry.input.title ?? entry.input.tool ?? '',
  );
  const verb = S.human[entry.tool];
  return verb ? verb(subject) : entry.tool.replace(/^ui\./, 'You ');
}

function resultLine(entry: AgentLogEntry): string {
  if (!entry.result) return '';
  return entry.result.ok ? entry.result.summary : entry.result.error;
}

function Row({ entry, epoch }: { entry: AgentLogEntry; epoch: number }) {
  const [open, setOpen] = useState(false);
  const failed = entry.status === 'error';
  const tone = entry.undone ? 'undone' : failed ? 'error' : entry.actor;
  // §E: authorship is legible from callsign + colour + rail, with no avatar art.
  const callsign = entry.actor === 'agent' ? S.callsignAgent : S.callsignHuman;

  const onUndo = () => {
    const result = undoEntry(entry.id);
    if (!result.ok) pushToast({ message: S.undoBlocked(result.reason), tone: 'warn' });
    else if (result.note) pushToast({ message: result.note, tone: 'info' });
  };

  return (
    <li className="alt-log__entry" data-tone={tone} data-source={entry.source} data-undone={entry.undone || undefined}>
      <div className="alt-log__head">
        <span className="alt-log__callsign" aria-hidden="true">
          {callsign} ▸
        </span>
        <button
          type="button"
          className="alt-log__tool alt-mono"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {entryLabel(entry)}
        </button>
        {entry.undone && <span className="alt-log__tag">{S.undoneTag}</span>}
        <time className="alt-log__time" dateTime={new Date(entry.timestamp).toISOString()}>
          {missionElapsed(entry.timestamp, epoch)}
        </time>
      </div>

      {Object.keys(entry.input).length > 0 && <p className="alt-log__input">{inputSummary(entry.input)}</p>}
      {resultLine(entry) && <p className="alt-log__result">{resultLine(entry)}</p>}

      {open && (
        <pre className="alt-log__well alt-mono">
          {JSON.stringify({ input: entry.input, result: entry.result }, null, 2)}
        </pre>
      )}

      {entry.inverse && !entry.undone && (
        <button type="button" className="alt-log__undo alt-btn" data-kind="ghost" onClick={onUndo}>
          ↶ {S.undo}
        </button>
      )}
    </li>
  );
}

/**
 * §5.4 / D-151, D-152. The log is the collaboration record: human actions sit next to agent
 * actions in one list, newest first, and anything with an inverse can be reversed from here.
 */
export default function AgentLog() {
  const entries = useLogStore((s) => s.entries);
  const clear = useLogStore((s) => s.clear);
  const source = useWebMCPStatusStore((s) => s.source);
  const [filter, setFilter] = useState<Filter>('all');
  const [confirming, setConfirming] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const countRef = useRef(entries.length);

  useEffect(() => {
    const grew = entries.length - countRef.current;
    countRef.current = entries.length;
    if (grew > 0 && (listRef.current?.scrollTop ?? 0) > 8) setUnseen((n) => n + grew);
  }, [entries.length]);

  const shown = [...entries].reverse().filter((e) => filter === 'all' || e.actor === filter);
  // The loop's T-zero: the first entry burned to the recorder. The 0 fallback is never read —
  // with no entries there is no row to stamp — and `Date.now()` here would be impure in render.
  const epoch = entries[0]?.timestamp ?? 0;

  const toTop = () => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setUnseen(0);
  };

  return (
    <aside className="alt-panel alt-panel--log" aria-label="Log">
      <div className="alt-log__header">
        <h2 className="alt-panel__title">{S.logTitle}</h2>
        <div className="alt-log__filters" role="group" aria-label="Filter log">
          {(['all', 'agent', 'human'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className="alt-chip"
              data-active={filter === f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
            >
              {S.logFilters[f]}
            </button>
          ))}
        </div>
        {confirming ? (
          <span className="alt-log__confirm">
            <button
              type="button"
              className="alt-btn"
              data-kind="ghost"
              onClick={() => {
                clear();
                setConfirming(false);
              }}
            >
              {S.logClear}?
            </button>
            <button type="button" className="alt-btn" data-kind="ghost" onClick={() => setConfirming(false)}>
              {S.resetNo}
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="alt-btn"
            data-kind="ghost"
            onClick={() => setConfirming(true)}
            disabled={entries.length === 0}
          >
            {S.logClear}
          </button>
        )}
      </div>

      {unseen > 0 && (
        <button type="button" className="alt-log__new" onClick={toTop}>
          {S.logNewPill(unseen)}
        </button>
      )}

      <ol
        className="alt-log__list"
        ref={listRef}
        aria-live="polite"
        onScroll={() => listRef.current?.scrollTop === 0 && setUnseen(0)}
      >
        {shown.map((entry) => (
          <Row key={entry.id} entry={entry} epoch={epoch} />
        ))}
      </ol>

      {shown.length === 0 && (
        <div className="alt-log__empty">
          <p>{S.logEmpty}</p>
          {source === 'native' ? (
            <ul className="alt-prompts">
              {S.prompts.map((p) => (
                <li key={p}>
                  <span>{p}</span>
                  <button
                    type="button"
                    className="alt-btn"
                    data-kind="ghost"
                    aria-label={`Copy prompt: ${p}`}
                    onClick={() => void navigator.clipboard?.writeText(p)}
                  >
                    Copy
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="alt-log__hint">{S.logEmptyPolyfill}</p>
          )}
        </div>
      )}
    </aside>
  );
}
