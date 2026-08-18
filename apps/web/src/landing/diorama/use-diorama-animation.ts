import type { RefObject } from 'react';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { hideStoryProps, playExitFade, playStory } from './diorama-story';

const CONTAINER_GUTTER = 128;
const REST_WIDTH = 1312;
const REST_RATIO = 820 / 1312;

export const HERO_OVERLAP_SVH = 32;

function restWidth() {
  return Math.min(window.innerWidth - CONTAINER_GUTTER, REST_WIDTH);
}

function animateStageEntry(section: HTMLElement | null) {
  gsap.fromTo(
    '[data-diorama-stage]',
    {
      width: restWidth,
      height: () => restWidth() * REST_RATIO,
      borderRadius: 24,
    },
    {
      width: '100%',
      height: '100%',
      borderRadius: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: `top ${100 - HERO_OVERLAP_SVH}%`,
        end: 'top top',
        scrub: true,
        invalidateOnRefresh: true,
      },
    },
  );
}

function animatePinnedStory(section: HTMLElement | null) {
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

  playStory(timeline);
  playExitFade(timeline);
  timeline.to(
    '[data-diorama-stage]',
    {
      width: restWidth,
      height: () => restWidth() * REST_RATIO,
      borderRadius: 24,
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

      hideStoryProps();
      animateStageEntry(sectionRef.current);
      animatePinnedStory(sectionRef.current);
    },
    { scope: sectionRef },
  );
}
