import type { LucideIcon } from 'lucide-react';

import { Asterisk, Share2, Sparkle } from 'lucide-react';

import { Port } from './port';

const KIND_STYLES = {
  gateway: { border: 'border-gateway', chip: 'bg-gateway/12', text: 'text-gateway' },
  'virtual-model': {
    border: 'border-virtual-model',
    chip: 'bg-virtual-model/12',
    text: 'text-virtual-model',
  },
  subscription: {
    border: 'border-subscription',
    chip: 'bg-subscription/12',
    text: 'text-subscription',
  },
} as const;

const KIND_GLYPHS = {
  gateway: Share2,
  'virtual-model': Sparkle,
  subscription: Asterisk,
} as const;

const PORT_SIDES = {
  in: ['left'],
  out: ['right'],
  both: ['left', 'right'],
  none: [],
} as const;

export type CanvasNode = {
  x?: number;
  y?: number;
  kind: keyof typeof KIND_STYLES;
  kicker: string;
  title: string;
  prose?: string;
  mono?: string;
  ports?: keyof typeof PORT_SIDES;
  glyph?: LucideIcon;
};

function detailRows(prose: string | undefined, mono: string | undefined) {
  const rows: { key: string; className: string; text: string }[] = [];

  if (prose !== undefined) {
    rows.push({
      key: 'prose',
      className: 'truncate text-caption leading-tight text-win-ink2',
      text: prose,
    });
  }

  if (mono !== undefined) {
    rows.push({
      key: 'mono',
      className: 'truncate font-mono text-annotation leading-tight text-win-ink2',
      text: mono,
    });
  }

  return rows;
}

export function NodeCard({ node, className }: { node: CanvasNode; className?: string }) {
  const { kicker, title, prose, mono } = node;
  const styles = KIND_STYLES[node.kind];
  const Glyph = node.glyph ?? KIND_GLYPHS[node.kind];
  const portTone = styles.text.replace('text-', 'bg-');

  return (
    <div
      className={`absolute flex flex-col justify-center gap-0.5 rounded-node bg-win-card shadow-xl ${styles.border} ${className ?? 'h-22 w-46 px-2.75'}`}
      style={
        className === undefined
          ? { left: node.x, top: node.y, borderWidth: 1.5 }
          : { borderWidth: 1.5 }
      }
    >
      <span className="flex items-center gap-1.5">
        <span className={`flex size-4.25 items-center justify-center rounded ${styles.chip}`}>
          <Glyph className={`size-2.75 ${styles.text}`} />
        </span>
        <span className={`text-caption font-medium tracking-wider uppercase ${styles.text}`}>
          {kicker}
        </span>
      </span>
      <span className="truncate text-control leading-tight font-medium text-win-ink">{title}</span>
      {detailRows(prose, mono).map((row) => (
        <span key={row.key} className={row.className}>
          {row.text}
        </span>
      ))}
      {PORT_SIDES[node.ports ?? 'out'].map((side) => (
        <Port key={side} tone={portTone} side={side} />
      ))}
    </div>
  );
}
