import { createFileRoute } from '@tanstack/react-router';

import { CtaSection } from '../landing/cta-section';
import { DioramaSection } from '../landing/diorama/diorama-section';
import { FaqSection } from '../landing/faq-section';
import { HeroSection } from '../landing/hero-section';
import { LocalSection } from '../landing/local-section';
import { MixSection } from '../landing/mix-section';
import { RouterSection } from '../landing/router-section';
import { SiteFooter } from '../landing/site-footer';

export const Route = createFileRoute('/')({
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
