import type { HeroSources } from './mount-hero';

import { mountHero } from './mount-hero';

const WIDE_STAGE = '(min-width: 768px)';

export function stageHero(
  canvas: HTMLCanvasElement,
  sources: HeroSources,
  gate: string = WIDE_STAGE,
): () => void {
  const wideStage = matchMedia(gate);
  let unmount: (() => void) | null = null;

  const lowerCurtain = () => {
    unmount?.();
    unmount = null;
    canvas.style.visibility = 'hidden';
  };

  const raiseCurtain = () => {
    if (unmount) return;
    canvas.style.visibility = 'visible';
    unmount = mountHero(canvas, sources);
  };

  const followGate = () => {
    if (wideStage.matches) raiseCurtain();
    else lowerCurtain();
  };

  const onContextLost = (event: Event) => {
    event.preventDefault();
    lowerCurtain();
  };

  canvas.addEventListener('webglcontextlost', onContextLost);
  wideStage.addEventListener('change', followGate);
  followGate();

  return () => {
    wideStage.removeEventListener('change', followGate);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    unmount?.();
    unmount = null;
  };
}
