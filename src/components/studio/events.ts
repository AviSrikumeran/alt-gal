/**
 * A tiny typed event bus for the three places where a Stream 5 surface has to trigger a Stream 1
 * or Stream 4 behaviour that owns state Stream 5 must not duplicate — the canvas empty states
 * (D-149) and the re-render button (D-139). Using events keeps the token and layout algorithms in
 * exactly one file each instead of forking them into the shell.
 */
export type StudioEvent =
  | 'alt:focus-primary' // Stream 1 — focus the primary swatch and open its popover
  | 'alt:fill-from-primary' // Stream 1 — apply the palette to every unlocked role (D-107)
  | 'alt:new-wireframe' // Stream 4 — open the New wireframe form (D-130)
  | 'alt:re-render'; // Stream 4 — unrender_page + render_page on the active wireframe (D-139)

export function emitStudio(event: StudioEvent, detail?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(event, { detail }));
}
