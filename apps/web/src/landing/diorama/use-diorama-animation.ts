import type { RefObject } from 'react';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

function animateStageEntry(
  section: HTMLElement | null,
  frameRef: RefObject<HTMLDivElement | null>,
) {
  const fullBleedScale = () => {
    const frame = frameRef.current;

    return frame ? window.innerWidth / frame.clientWidth : 1;
  };
  const dockKeepingShift = () => {
    const frame = frameRef.current;

    if (!frame) return 0;

    return Math.min(0, (window.innerHeight - frame.clientHeight * fullBleedScale()) / 2);
  };

  gsap.fromTo(
    '[data-diorama-stage]',
    { scale: 1, y: 0, transformOrigin: 'center center' },
    {
      scale: fullBleedScale,
      y: dockKeepingShift,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'top top',
        scrub: true,
        invalidateOnRefresh: true,
      },
    },
  );
}

function animateNarration(section: HTMLElement | null) {
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      pin: '[data-diorama-viewport]',
      pinSpacing: false,
    },
  });

  timeline
    .to('[data-diorama-scrim]', { opacity: 1, duration: 0.12 }, 0.2)
    .to('[data-narration-char]', { opacity: 1, duration: 0.001, stagger: 0.005, ease: 'none' }, 0.3)
    .to('[data-diorama-stage]', { scale: 1, y: 0, ease: 'none', duration: 0.14 }, 0.86);
}

export function useDioramaAnimation(
  sectionRef: RefObject<HTMLElement | null>,
  frameRef: RefObject<HTMLDivElement | null>,
) {
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.registerPlugin(ScrollTrigger);

      gsap.set('[data-narration-char]', { opacity: 0 });
      animateStageEntry(sectionRef.current, frameRef);
      animateNarration(sectionRef.current);
    },
    { scope: sectionRef },
  );
}
