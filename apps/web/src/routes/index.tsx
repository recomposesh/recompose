import { createFileRoute } from '@tanstack/react-router';

import { CtaSection } from '../landing/cta-section';
import { DioramaSection } from '../landing/diorama/diorama-section';
import { FaqSection } from '../landing/faq-section';
import { HeroSection } from '../landing/hero-section';
import { LocalSection } from '../landing/local-section';
import { MixSection } from '../landing/mix-section';
import { RouterSection } from '../landing/router-section';
import { SiteFooter } from '../landing/site-footer';
import { pageMeta } from '../lib/seo';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: pageMeta({
      title: 'recompose',
      description:
        'compose every model you can reach into every harness you run. free and open source.',
      path: '/',
    }),
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <main className="relative bg-fd-background">
        <HeroSection />
        <DioramaSection />
        <MixSection />
        <RouterSection />
        <LocalSection />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
