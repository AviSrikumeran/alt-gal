import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PAGE_TYPE_SECTIONS, SECTION_BOX, createWireframe } from '@/engine/wireframeEngine';
import { WireframePreview } from '@/components/canvas/WireframePreview';

const landing = () => createWireframe({ pageType: 'landing', title: 'Northwind', createdBy: 'human' });

describe('WireframePreview', () => {
  it('renders one gray box per section, labelled and placeholdered', () => {
    const wireframe = landing();
    const html = renderToStaticMarkup(<WireframePreview wireframe={wireframe} />);

    expect(html.match(/class="alt-wf__box"/g)).toHaveLength(6);
    for (const type of PAGE_TYPE_SECTIONS.landing) {
      expect(html).toContain(`data-section="${type}"`);
      expect(html).toContain(SECTION_BOX[type].placeholder);
    }
    expect(html).toContain('>NAVBAR<');
    expect(html).toContain('>FEATURES · 3 COL<');
    expect(html).toContain('height:320px'); // features, per the §4.1 table
  });

  it('draws inner boxes only for grid sections', () => {
    const html = renderToStaticMarkup(<WireframePreview wireframe={landing()} />);
    // features (3) + pricing (3); hero, navbar, faq and footer draw none.
    expect(html.match(/class="alt-wf__innerbox"/g)).toHaveLength(6);
  });

  it('offers move, remove, and add controls for every section (D-129)', () => {
    const html = renderToStaticMarkup(<WireframePreview wireframe={landing()} />);
    expect(html.match(/aria-label="Move up"/g)).toHaveLength(6);
    expect(html.match(/aria-label="Move down"/g)).toHaveLength(6);
    expect(html.match(/aria-label="Remove section"/g)).toHaveLength(6);
    expect(html.match(/aria-label="Add section"/g)).toHaveLength(7); // one rail above each box, one at the end
    expect(html).toContain('disabled=""'); // the first box cannot move up
  });

  it('plays the boxes out during the render transition (D-137)', () => {
    expect(renderToStaticMarkup(<WireframePreview wireframe={landing()} />)).not.toContain('data-rendering');
    expect(renderToStaticMarkup(<WireframePreview wireframe={landing()} exiting />)).toContain('data-rendering="out"');
  });
});
