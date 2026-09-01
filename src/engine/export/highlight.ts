import type { ExportFile } from '@/types/export';

/**
 * D-174: a ~40-line regex highlighter, so the export preview needs no highlighting dependency.
 * Returns HTML with `<span class="hl-*">` wrappers; the caller escapes nothing else.
 */

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const KEYWORDS =
  /\b(import|export|default|from|const|let|var|function|return|type|interface|extends|as|if|else|for|of|in|new|true|false|null|undefined)\b/g;

interface Rule {
  cls: string;
  re: RegExp;
}

const RULES: Record<ExportFile['language'], Rule[]> = {
  css: [
    { cls: 'hl-comment', re: /\/\*[\s\S]*?\*\//g },
    { cls: 'hl-prop', re: /--[a-z0-9-]+/g },
    { cls: 'hl-string', re: /'[^']*'|"[^"]*"/g },
    { cls: 'hl-number', re: /\b-?\d+(\.\d+)?(px|ms|rem|em|%|s)?\b/g },
    { cls: 'hl-key', re: /@[a-z-]+|\.[a-z][\w-]*(?=\s*\{)|:root/g },
  ],
  scss: [
    { cls: 'hl-comment', re: /\/\/[^\n]*|\/\*[\s\S]*?\*\//g },
    { cls: 'hl-prop', re: /\$[a-z0-9-]+/g },
    { cls: 'hl-number', re: /\b-?\d+(\.\d+)?(px|ms|rem|em|%|s)?\b/g },
    { cls: 'hl-key', re: /@[a-z-]+/g },
  ],
  json: [
    { cls: 'hl-key', re: /"[^"]*"(?=\s*:)/g },
    { cls: 'hl-string', re: /"(?:[^"\\]|\\.)*"/g },
    { cls: 'hl-number', re: /\b-?\d+(\.\d+)?\b/g },
  ],
  ts: [
    { cls: 'hl-comment', re: /\/\/[^\n]*|\/\*[\s\S]*?\*\//g },
    { cls: 'hl-string', re: /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g },
    { cls: 'hl-key', re: KEYWORDS },
    { cls: 'hl-number', re: /\b-?\d+(\.\d+)?\b/g },
  ],
  tsx: [
    { cls: 'hl-comment', re: /\/\/[^\n]*|\/\*[\s\S]*?\*\//g },
    { cls: 'hl-string', re: /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g },
    { cls: 'hl-tag', re: /<\/?[A-Za-z][\w.-]*/g },
    { cls: 'hl-key', re: KEYWORDS },
    { cls: 'hl-number', re: /\b-?\d+(\.\d+)?\b/g },
  ],
  md: [
    { cls: 'hl-key', re: /^#{1,6} .*$/gm },
    { cls: 'hl-string', re: /`[^`]*`/g },
  ],
};

interface Span {
  start: number;
  end: number;
  cls: string;
}

/** Non-overlapping first-match-wins spans, then one escaped pass over the source. */
export function highlight(code: string, language: ExportFile['language']): string {
  const spans: Span[] = [];
  const taken = (start: number, end: number) => spans.some((s) => start < s.end && end > s.start);
  for (const rule of RULES[language] ?? []) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(code)) !== null) {
      if (m[0].length === 0) {
        rule.re.lastIndex++;
        continue;
      }
      if (!taken(m.index, m.index + m[0].length))
        spans.push({ start: m.index, end: m.index + m[0].length, cls: rule.cls });
    }
  }
  spans.sort((a, b) => a.start - b.start);

  let out = '';
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue;
    out += escapeHtml(code.slice(cursor, span.start));
    out += `<span class="${span.cls}">${escapeHtml(code.slice(span.start, span.end))}</span>`;
    cursor = span.end;
  }
  out += escapeHtml(code.slice(cursor));
  return out;
}
