import { ToolInputError } from '@/types/webmcp';

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
export function optionalStringArray(input: Record<string, unknown>, key: string, max = 12): string[] | undefined {
  const v = input[key];
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string'))
    throw new ToolInputError(`"${key}" must be an array of strings.`);
  if (v.length > max) throw new ToolInputError(`"${key}" accepts at most ${max} items — got ${v.length}.`);
  return v as string[];
}
