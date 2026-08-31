// ComponentPreview.tsx
'use client';
import type { ComponentSpec } from '@/types/components';
import { COMPONENT_REGISTRY } from '@/components/library';
import { useUIStore } from '@/stores/uiStore';
import './canvas.css';
const FULL_WIDTH = new Set(['navbar', 'hero', 'feature-grid', 'footer']);
export function ComponentPreview({ spec }: { spec: ComponentSpec }) {
  const selected = useUIStore((s) => s.selectedComponentId === spec.id);
  const select = useUIStore((s) => s.select);
  const C = COMPONENT_REGISTRY[spec.type];
  return (
    <section
      className="alt-specimen"
      data-selected={selected || undefined}
      data-full={FULL_WIDTH.has(spec.type) || undefined}
      aria-label={`${spec.type} ${spec.id}`}
      onClick={(e) => {
        e.stopPropagation();
        select(spec.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') select(spec.id);
      }}
      tabIndex={0}
    >
      <header className="alt-specimen__head">
        <code>{spec.type}</code>
        <span>
          {spec.variant} · {spec.size}
        </span>
        <code className="alt-specimen__id">{spec.id}</code>
      </header>
      <div className="alt-specimen__body">
        <C spec={spec} selected={selected} />
      </div>
    </section>
  );
}
