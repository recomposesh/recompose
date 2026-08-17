import ClaudeMono from '@lobehub/icons/es/Claude/components/Mono';
import ClineMono from '@lobehub/icons/es/Cline/components/Mono';
import CodexMono from '@lobehub/icons/es/Codex/components/Mono';
import CursorMono from '@lobehub/icons/es/Cursor/components/Mono';
import GeminiColor from '@lobehub/icons/es/Gemini/components/Color';
import OpenCodeMono from '@lobehub/icons/es/OpenCode/components/Mono';

import { NoteMark } from './note-mark';
import { ZedMark } from './zed-mark';

const TILES: Record<string, { background: string; glyph: React.ReactNode }> = {
  recompose: {
    background: 'bg-gradient-to-b from-note-tile-start to-note-tile-end',
    glyph: <NoteMark className="w-auto text-white" style={{ height: '46%' }} />,
  },
  'claude code': {
    background: 'bg-claude',
    glyph: <ClaudeMono className="text-white" size="55%" />,
  },
  codex: {
    background: 'border border-stage-line bg-white',
    glyph: <CodexMono className="text-black" size="55%" />,
  },
  cursor: {
    background: 'bg-tile',
    glyph: <CursorMono className="text-white" size="55%" />,
  },
  zed: {
    background: 'bg-tile',
    glyph: <ZedMark className="text-white" style={{ width: '62%', height: '62%' }} />,
  },
  opencode: {
    background: 'bg-tile',
    glyph: <OpenCodeMono className="text-white" size="55%" />,
  },
  cline: {
    background: 'border border-stage-line bg-white',
    glyph: <ClineMono className="text-black" size="55%" />,
  },
  'gemini cli': {
    background: 'border border-stage-line bg-white',
    glyph: <GeminiColor size="58%" />,
  },
};

export function BrandTile({ name, className = 'size-12' }: { name: string; className?: string }) {
  const tile = TILES[name];

  if (!tile) return null;

  return (
    <span
      className={`flex items-center justify-center overflow-hidden ${tile.background} ${className}`}
      style={{ borderRadius: '24%' }}
    >
      {tile.glyph}
    </span>
  );
}
