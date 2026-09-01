/**
 * sectionBlocks — the three sections that have no library component (D-133).
 *
 * gallery, stats, and team are token-styled blocks, not ComponentSpecs, so they
 * are not addressable by `modify_component`. Every value is a token reference,
 * the same no-literal regime as the component library (D-065).
 */
import type { CSSProperties } from 'react';
import type { RenderedSection, SectionType } from '@/types/layouts';
import { v } from '@/components/library/_shared';
import { BLOCK_CONTENT } from './sectionContent';

export type BlockSectionType = 'gallery' | 'stats' | 'team';

const gridStyle = (columns: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  gap: v('spacing.6'),
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const STYLES = {
  figure: {
    display: 'grid',
    placeItems: 'center',
    aspectRatio: '4 / 3',
    margin: 0,
    backgroundColor: v('color.muted'),
    borderRadius: v('radius.lg'),
    color: v('color.text-muted'),
  },
  stat: { display: 'flex', flexDirection: 'column', gap: v('spacing.1') },
  statValue: {
    fontFamily: v('font.heading'),
    fontSize: v('fontSize.4xl'),
    fontWeight: v('fontWeight.bold'),
    lineHeight: v('lineHeight.tight'),
    color: v('color.text-primary'),
    letterSpacing: '-0.02em',
  },
  statLabel: {
    fontFamily: v('font.body'),
    fontSize: v('fontSize.sm'),
    fontWeight: v('fontWeight.regular'),
    lineHeight: v('lineHeight.normal'),
    color: v('color.text-secondary'),
  },
  member: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: v('spacing.3'), textAlign: 'center' },
  memberAvatar: {
    display: 'grid',
    placeItems: 'center',
    width: v('spacing.16'),
    height: v('spacing.16'),
    borderRadius: v('radius.full'),
    backgroundColor: `color-mix(in srgb, ${v('color.primary')} 15%, transparent)`,
    color: v('color.primary'),
    fontFamily: v('font.heading'),
    fontSize: v('fontSize.lg'),
    fontWeight: v('fontWeight.semibold'),
    letterSpacing: '0.02em',
  },
  memberName: {
    fontFamily: v('font.heading'),
    fontSize: v('fontSize.md'),
    fontWeight: v('fontWeight.semibold'),
    lineHeight: v('lineHeight.tight'),
    color: v('color.text-primary'),
  },
  memberRole: {
    fontFamily: v('font.body'),
    fontSize: v('fontSize.sm'),
    fontWeight: v('fontWeight.regular'),
    lineHeight: v('lineHeight.normal'),
    color: v('color.text-secondary'),
  },
} satisfies Record<string, CSSProperties>;

/** D-094: inline SVG, currentColor, three paths at most. */
function ImageGlyph() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5-9 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function isBlockSectionType(type: SectionType): type is BlockSectionType {
  return type === 'gallery' || type === 'stats' || type === 'team';
}

/** Renders one of the three block sections. Returns null for any section that maps to a component. */
export function SectionBlock({ section }: { section: RenderedSection }) {
  if (!isBlockSectionType(section.type)) return null;
  const columns = section.columns ?? 4;

  if (section.type === 'gallery') {
    return (
      <ul data-block="gallery" data-part="grid" style={gridStyle(columns)}>
        {Array.from({ length: columns }, (_, i) => (
          <li key={i}>
            <figure data-part="figure" style={STYLES.figure} aria-label={BLOCK_CONTENT.gallery.caption}>
              <ImageGlyph />
            </figure>
          </li>
        ))}
      </ul>
    );
  }

  if (section.type === 'stats') {
    return (
      <ul data-block="stats" data-part="grid" style={gridStyle(columns)}>
        {Array.from({ length: columns }, (_, i) => {
          const stat = BLOCK_CONTENT.stats[i % BLOCK_CONTENT.stats.length]!;
          return (
            <li key={i} data-part="stat" style={STYLES.stat}>
              <span data-part="value" style={STYLES.statValue}>
                {stat.value}
              </span>
              <span data-part="label" style={STYLES.statLabel}>
                {stat.label}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul data-block="team" data-part="grid" style={gridStyle(columns)}>
      {Array.from({ length: columns }, (_, i) => {
        const person = BLOCK_CONTENT.team[i % BLOCK_CONTENT.team.length]!;
        return (
          <li key={i} data-part="member" style={STYLES.member}>
            <span data-part="avatar" style={STYLES.memberAvatar} aria-hidden>
              {person.initials}
            </span>
            <span data-part="name" style={STYLES.memberName}>
              {person.name}
            </span>
            <span data-part="role" style={STYLES.memberRole}>
              {person.role}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
