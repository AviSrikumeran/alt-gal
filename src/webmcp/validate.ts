import { ToolInputError } from '@/types/webmcp';
import type { ToolOutcome } from '@/types/webmcp';
import type { TokenPath } from '@/types/tokens';
import { CATEGORY_TO_GROUP, TOKEN_CATEGORIES, TOKEN_PATHS } from '@/types/tokens';

const q = (v: unknown) => JSON.stringify(v);
export function requireString(input: Record<string, unknown>, key: string): string {
  const v = input[key];
  if (typeof v !== 'string' || v.trim() === '')
    throw new ToolInputError(`"${key}" is required and must be a non-empty string.`);
  return v.trim();
}
export function optionalString(input: Record<string, unknown>, key: string): string | undefined {
  const v = input[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') throw new ToolInputError(`"${key}" must be a string — got ${q(v)}.`);
  return v;
}
export function requireEnum<T extends string>(input: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const v = input[key];
  if (typeof v !== 'string' || !allowed.includes(v as T))
    throw new ToolInputError(`"${key}" must be one of: ${allowed.join(', ')} — got ${q(v)}.`, [...allowed]);
  return v as T;
}
export function optionalEnum<T extends string>(
  input: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  return input[key] === undefined ? fallback : requireEnum(input, key, allowed);
}
export function optionalNumber(
  input: Record<string, unknown>,
  key: string,
  opts?: { min?: number; max?: number; integer?: boolean },
): number | undefined {
  const v = input[key];
  if (v === undefined || v === null) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new ToolInputError(`"${key}" must be a number — got ${q(v)}.`);
  if (opts?.integer && !Number.isInteger(n)) throw new ToolInputError(`"${key}" must be a whole number — got ${n}.`);
  if (opts?.min !== undefined && n < opts.min)
    throw new ToolInputError(`"${key}" must be at least ${opts.min} — got ${n}.`);
  if (opts?.max !== undefined && n > opts.max)
    throw new ToolInputError(`"${key}" must be at most ${opts.max} — got ${n}.`);
  return n;
}
export function requireStringArray(input: Record<string, unknown>, key: string, max = 12): string[] {
  const v = optionalStringArray(input, key, max);
  if (!v || v.length === 0) throw new ToolInputError(`"${key}" is required and must contain at least one string.`);
  return v;
}
export function optionalStringArray(input: Record<string, unknown>, key: string, max = 12): string[] | undefined {
  const v = input[key];
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string'))
    throw new ToolInputError(`"${key}" must be an array of strings.`);
  if (v.length > max) throw new ToolInputError(`"${key}" accepts at most ${max} items — got ${v.length}.`);
  return v as string[];
}

/**
 * Runs a tool body and converts the two throwable outcomes into envelope-ready errors:
 * ToolInputError → INVALID_INPUT (D-076), anything else → INTERNAL (D-008).
 * Every tool wraps its body in this, so `execute` never throws and the registration
 * wrapper's own catch stays a backstop rather than the mapping layer.
 */
export function guard<T>(run: () => ToolOutcome<T>): ToolOutcome<T> {
  try {
    return run();
  } catch (e) {
    if (e instanceof ToolInputError)
      return { kind: 'error', code: 'INVALID_INPUT', message: e.message, alternatives: e.alternatives };
    return { kind: 'error', code: 'INTERNAL', message: e instanceof Error ? e.message : String(e) };
  }
}

/** Keys a `category` accepts, derived from TOKEN_PATHS so the type is the only source (D-044). */
export function keysForCategory(category: string): string[] {
  const group = CATEGORY_TO_GROUP[category];
  if (!group) return [];
  const keys = TOKEN_PATHS.filter((p) => p.startsWith(`${group}.`)).map((p) => p.slice(group.length + 1));
  if (category === 'animation-duration') return keys.filter((k) => k.startsWith('duration'));
  if (category === 'animation-easing') return keys.filter((k) => k.startsWith('easing'));
  return keys;
}

/** `{category,key}` → TokenPath (D-044). Throws ToolInputError listing the valid values (mace pattern). */
export function resolveTokenPath(input: Record<string, unknown>): TokenPath {
  const category = requireEnum(input, 'category', TOKEN_CATEGORIES);
  const key = requireString(input, 'key');
  const keys = keysForCategory(category);
  if (!keys.includes(key))
    throw new ToolInputError(`"key" must be one of: ${keys.join(', ')} for category "${category}" — got ${q(key)}.`, [
      ...keys,
    ]);
  return `${CATEGORY_TO_GROUP[category]}.${key}` as TokenPath;
}
