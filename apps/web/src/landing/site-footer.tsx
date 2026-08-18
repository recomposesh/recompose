import { Link } from '@tanstack/react-router';

import { gitHubUrl } from '../lib/links';
import { FooterBeam } from './footer-beam';
import { FooterColumn } from './footer-column';
import { FooterWordmark } from './footer-wordmark';
import { NoteMark } from './note-mark';

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-stage">
      <FooterBeam />

      <div className="relative mx-auto max-w-360 px-16 pt-28 pb-16">
        <div className="flex flex-col justify-between gap-16 lg:flex-row">
          <div className="flex items-start gap-3">
            <NoteMark className="mt-1.5 h-5.5 w-4 text-stage-bright" />
            <p className="font-serif text-base leading-relaxed tracking-wide text-stage-bright">
              EVERY MODEL, IN EVERY HARNESS,
              <br />
              ONE GATEWAY TO RUN.
            </p>
          </div>

          <div className="flex gap-24">
            <FooterColumn label="PRODUCT">
              <Link to="/docs/$" params={{ _splat: '' }} className="footer-link">
                docs
              </Link>
              <Link to="/changelog" className="footer-link">
                changelog
              </Link>
              <Link to="/download" className="footer-link">
                download
              </Link>
            </FooterColumn>
            <FooterColumn label="PROJECT">
              <a href={gitHubUrl} className="footer-link">
                github
              </a>
              <a href={`${gitHubUrl}/blob/main/LICENSE`} className="footer-link">
                license
              </a>
              <a href={gitHubUrl} className="footer-link">
                privacy
              </a>
            </FooterColumn>
          </div>
        </div>

        <FooterWordmark />
      </div>
    </footer>
  );
}
