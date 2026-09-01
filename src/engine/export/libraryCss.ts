/**
 * GENERATED — do not edit. Run `node scripts/sync-library-css.mjs` after changing
 * src/components/library/library.css. Shipped verbatim inside the CSS export (D-167).
 */
export const LIBRARY_CSS = `/* Alternative Galaxy component library — interactive states and container-responsive rules.
   Every value is a token var. Loaded once by StudioShell; emitted verbatim by export. */

/* ---- focus (D-092) ------------------------------------------------------ */
[data-alt] :is(button, a, input, textarea, select, [role='switch']):focus-visible,
[data-alt='button']:focus-visible,
[data-alt='toggle']:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ---- button ------------------------------------------------------------ */
[data-alt='button']:hover:not([data-state='disabled']):not([data-state='loading']) {
  filter: brightness(0.94);
}
[data-alt='button']:active:not([data-state='disabled']) {
  transform: translateY(1px);
}
[data-alt='button'][data-variant='ghost']:hover {
  background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
  filter: none;
}
[data-alt='button'][data-variant='outline']:hover {
  background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
  filter: none;
}
[data-alt='button'][data-state='disabled'] {
  opacity: 0.5;
  cursor: not-allowed;
}
[data-alt='button'][data-state='loading'] {
  color: transparent;
  position: relative;
  pointer-events: none;
}
[data-alt='button'][data-state='loading']::after {
  content: '';
  position: absolute;
  width: 1em;
  height: 1em;
  border-radius: var(--radius-full);
  border: 2px solid currentColor;
  border-right-color: transparent;
  color: var(--color-on-primary);
  animation: alt-spin var(--animation-duration-slow) linear infinite;
}
[data-alt='button'][data-variant='ghost'][data-state='loading']::after,
[data-alt='button'][data-variant='outline'][data-state='loading']::after {
  color: var(--color-primary);
}
@keyframes alt-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---- card / pricing-card ---------------------------------------------- */
[data-alt='card']:hover {
  box-shadow: var(--elevation-md);
  transform: translateY(-2px);
}
[data-alt='pricing-card']:hover {
  transform: translateY(-2px);
}
[data-alt='pricing-card'] [data-part='featuredBadge'] {
  position: absolute;
  top: calc(var(--spacing-3) * -1);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font: var(--font-weight-semibold) var(--font-size-xs) / var(--line-height-tight) var(--font-body);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ---- inputs ------------------------------------------------------------ */
[data-alt='input'] [data-part='field']:hover,
[data-alt='textarea'] [data-part='field']:hover,
[data-alt='select'] [data-part='field']:hover {
  border-color: var(--color-text-muted);
}
[data-alt='input'] [data-part='field']:focus,
[data-alt='textarea'] [data-part='field']:focus,
[data-alt='select'] [data-part='field']:focus {
  border-color: var(--alt-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--alt-accent) 25%, transparent);
  outline: none;
}
[data-alt][data-state='error'] [data-part='field'] {
  border-color: var(--color-danger);
}
[data-alt][data-state='error'] [data-part='field']:focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-danger) 25%, transparent);
  border-color: var(--color-danger);
}
[data-alt][data-state='error'] [data-part='helper'] {
  color: var(--color-danger);
}
[data-alt][data-state='disabled'] [data-part='field'] {
  background-color: var(--color-muted);
  color: var(--color-text-muted);
  cursor: not-allowed;
}
[data-alt='input'] [data-part='field']::placeholder,
[data-alt='textarea'] [data-part='field']::placeholder {
  color: var(--color-text-muted);
}

/* ---- toggle ------------------------------------------------------------ */
[data-alt='toggle']:hover [data-part='track'] {
  filter: brightness(0.96);
}
[data-alt='toggle'][data-state='disabled'] {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---- navbar / footer links -------------------------------------------- */
[data-alt='navbar'] [data-part='link']:hover {
  color: var(--color-text-primary);
}
[data-alt='navbar'] [data-part='cta']:hover {
  filter: brightness(0.94);
}
[data-alt='footer'] [data-part='link']:hover {
  color: var(--color-text-primary);
}
[data-alt='navbar'] [data-part='menu'] {
  display: none;
}

/* ---- hero CTAs --------------------------------------------------------- */
[data-alt='hero'] [data-part='primaryCta']:hover {
  filter: brightness(0.94);
}
[data-alt='hero'] [data-part='secondaryCta']:hover {
  background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

/* ---- modal / toast / accordion --------------------------------------- */
[data-alt='modal'] [data-part='confirm']:hover {
  filter: brightness(0.94);
}
[data-alt='modal'] [data-part='cancel']:hover {
  background-color: var(--color-muted);
}
[data-alt='toast'] [data-part='dismiss']:hover {
  color: var(--color-text-primary);
  background-color: var(--color-muted);
}
[data-alt='accordion'] [data-part='trigger']:hover {
  background-color: color-mix(in srgb, var(--color-primary) 5%, transparent);
}
[data-alt='accordion'] [data-part='trigger'][aria-expanded='true'] [data-part='chevron'] {
  transform: rotate(180deg);
}
[data-alt='accordion'] [data-part='item']:last-child {
  border-bottom: none;
}
[data-alt='accordion'] [data-part='panel'][hidden] {
  display: none;
}

/* ---- container-responsive (D-085) ------------------------------------- */
@container canvas (max-width: 640px) {
  [data-alt='hero'] [data-part='headline'] {
    font-size: var(--font-size-2xl);
  }
  [data-alt='hero'] {
    padding-block: var(--spacing-10);
    padding-inline: var(--spacing-5);
  }
  [data-alt='hero'] [data-part='actions'] {
    flex-direction: column;
    width: 100%;
  }
  [data-alt='hero'] [data-part='primaryCta'],
  [data-alt='hero'] [data-part='secondaryCta'] {
    width: 100%;
    justify-content: center;
  }
  [data-alt='navbar'] {
    padding-inline: var(--spacing-5);
  }
  [data-alt='navbar'] [data-part='links'] {
    display: none;
  }
  [data-alt='navbar'] [data-part='menu'] {
    display: inline-flex;
  }
  [data-alt='feature-grid'] [data-part='grid'] {
    grid-template-columns: 1fr;
  }
  [data-alt='feature-grid'],
  [data-alt='footer'] {
    padding-inline: var(--spacing-5);
  }
  [data-alt='footer'] [data-part='columns'] {
    flex-direction: column;
    gap: var(--spacing-6);
  }
  [data-alt='pricing-card'] [data-part='price'] {
    font-size: var(--font-size-3xl);
  }
  [data-alt='input'] [data-part='root'],
  [data-alt='textarea'],
  [data-alt='select'] {
    max-width: 100%;
  }
}
@container canvas (max-width: 900px) {
  [data-alt='feature-grid'] [data-part='grid'] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;
