import { Link } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

import { SiteNavDesktop } from './site-nav-desktop';
import { SiteNavMenu } from './site-nav-menu';
import { Wordmark } from './wordmark';

const MOBILE_INK = {
  page: '',
  stage: 'max-md:text-neutral-50',
};

export function SiteNav({ tone = 'page' }: { tone?: keyof typeof MOBILE_INK }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileInk = MOBILE_INK[tone];

  return (
    <nav className="relative z-10 mx-auto w-full max-w-360 px-5 text-base md:px-10 lg:px-16">
      <div className="flex items-center justify-between py-6">
        <Link
          to="/"
          aria-label="recompose"
          className={`relative inline-flex text-fd-foreground ${mobileInk}`}
        >
          <Wordmark height={22} />
          <span aria-hidden="true" data-spot="mask" className="spot-mask absolute inset-0">
            <Wordmark height={22} />
          </span>
        </Link>

        <SiteNavDesktop />

        <button
          type="button"
          aria-label="menu"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((open) => !open);
          }}
          className={`text-fd-foreground md:hidden ${mobileInk}`}
        >
          {menuOpen ? <X className="size-5.5" /> : <Menu className="size-5.5" />}
        </button>
      </div>

      {menuOpen && <SiteNavMenu />}
    </nav>
  );
}
