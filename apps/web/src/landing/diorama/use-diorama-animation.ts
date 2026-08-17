import type { RefObject } from 'react';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const CONTAINER_GUTTER = 128;
const REST_WIDTH = 1312;
const REST_RATIO = 820 / 1312;

function restWidth() {
  return Math.min(window.innerWidth - CONTAINER_GUTTER, REST_WIDTH);
}

function animateStageEntry(section: HTMLElement | null) {
  gsap.fromTo(
    '[data-diorama-stage]',
    {
      width: restWidth,
      height: () => restWidth() * REST_RATIO,
      borderRadius: 16,
    },
    {
      width: () => window.innerWidth,
      height: () => window.innerHeight,
      borderRadius: 0,
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
    .to(
      '[data-diorama-stage]',
      {
        width: restWidth,
        height: () => restWidth() * REST_RATIO,
        borderRadius: 16,
        ease: 'none',
        duration: 0.14,
      },
      0.86,
    );
}

export function useDioramaAnimation(sectionRef: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.registerPlugin(ScrollTrigger);

      gsap.set('[data-narration-char]', { opacity: 0 });
      animateStageEntry(sectionRef.current);
      animateNarration(sectionRef.current);
    },
    { scope: sectionRef },
  );
}
