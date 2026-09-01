import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { FIXTURE_VARS } from './vars';

/**
 * Renders into a wrapper carrying every token var at a fixed value (§11.2 isolation test), with the canvas
 * container declared so the D-085 container queries have something to resolve against.
 */
export function renderWithVars(ui: ReactElement) {
  const host = document.createElement('div');
  host.style.setProperty('container', 'canvas / inline-size');
  for (const [name, value] of Object.entries(FIXTURE_VARS)) host.style.setProperty(name, value);
  document.body.appendChild(host);
  return { host, ...render(ui, { container: host }) };
}
